#!/usr/bin/env python3
"""
Zeno dMRV Policy — Dry Run Test
Tests the full workflow: registration → approval → sensor data → compliance → minting
"""

import json
import requests
import sys
import time

MGS_URL = "https://guardianservice.app/api/v1"
USERNAME = "akash-m"
PASSWORD = "akash17327"
TENANT_ID = "69b0e1a5b519ad433329ea73"
POLICY_ID = "69b14a152a75f6d261a646dc"

class MGSClient:
    def __init__(self):
        self.token = None
        self.headers = {}

    def authenticate(self):
        print("=== Authenticating ===")
        r = requests.post(f"{MGS_URL}/accounts/login", json={
            "username": USERNAME, "password": PASSWORD, "tenantId": TENANT_ID
        })
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        refresh = r.json()["refreshToken"]

        r = requests.post(f"{MGS_URL}/accounts/access-token", json={"refreshToken": refresh})
        assert r.status_code in [200, 201], f"Token failed: {r.status_code}"
        self.token = r.json()["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        print("  Authenticated OK")

    def get(self, path, **kwargs):
        r = requests.get(f"{MGS_URL}{path}", headers=self.headers, **kwargs)
        return r

    def post(self, path, json_data=None, **kwargs):
        r = requests.post(f"{MGS_URL}{path}", headers=self.headers, json=json_data, **kwargs)
        return r

    def put(self, path, json_data=None, **kwargs):
        r = requests.put(f"{MGS_URL}{path}", headers=self.headers, json=json_data, **kwargs)
        return r


def step1_start_dry_run(client):
    """Switch policy from DRAFT to DRY-RUN mode."""
    print("\n=== Step 1: Start Dry Run ===")

    # Check current status
    r = client.get(f"/policies/{POLICY_ID}")
    status = r.json().get("status")
    print(f"  Current status: {status}")

    if status == "DRY-RUN":
        print("  Already in DRY-RUN mode")
        return True

    if status != "DRAFT":
        print(f"  ERROR: Policy must be in DRAFT status, got {status}")
        return False

    # Start dry run (needs empty body or no content-type)
    r = requests.put(f"{MGS_URL}/policies/{POLICY_ID}/dry-run",
                     headers={"Authorization": f"Bearer {client.token}"})
    print(f"  Dry run response: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()
        print(f"  Response: {json.dumps(resp, indent=2)[:500]}")
    else:
        print(f"  Response body: {r.text[:500]}")

    # Wait for policy to load
    print("  Waiting for policy to load...")
    for i in range(30):
        time.sleep(3)
        r = client.get(f"/policies/{POLICY_ID}")
        status = r.json().get("status")
        print(f"  ... status: {status} ({(i+1)*3}s)")
        if status == "DRY-RUN":
            print("  Dry Run mode ACTIVE")
            return True
        if status == "PUBLISH_ERROR":
            print(f"  ERROR: Policy failed to load")
            return False

    print("  TIMEOUT waiting for dry run")
    return False


def step2_create_virtual_users(client):
    """Create virtual users for each role."""
    print("\n=== Step 2: Create Virtual Users ===")

    users = {}
    for role in ["Facility", "SPCB", "VVB", "IoT"]:
        # POST with no content-type to avoid "body cannot be empty" error
        r = requests.post(f"{MGS_URL}/policies/{POLICY_ID}/dry-run/user",
                         headers={"Authorization": f"Bearer {client.token}"})
        print(f"  Create user ({role}): {r.status_code}")
        if r.status_code in [200, 201]:
            user_data = r.json()
            print(f"  User created: {json.dumps(user_data, indent=2)[:200]}")
            users[role] = user_data
        else:
            print(f"  Error: {r.text[:200]}")

    # List all virtual users
    r = client.get(f"/policies/{POLICY_ID}/dry-run/users")
    if r.status_code == 200:
        all_users = r.json()
        print(f"\n  Total virtual users: {len(all_users)}")
        for u in all_users:
            print(f"    {u.get('username', '?')} | did={u.get('did', '?')[:30]}... | role={u.get('role', '?')}")

    return users


def step3_login_as_user(client, user_data):
    """Login as a virtual user."""
    login_payload = {"did": user_data.get("did")}
    r = client.post(f"/policies/{POLICY_ID}/dry-run/login", json_data=login_payload)
    print(f"  Login as {user_data.get('username', '?')}: {r.status_code}")
    if r.status_code in [200, 201]:
        return r.json()
    else:
        print(f"  Error: {r.text[:200]}")
        return None


def step4_get_policy_blocks(client):
    """Get the current block state for the logged-in user."""
    print("\n=== Get Policy Blocks ===")
    r = client.get(f"/policies/{POLICY_ID}/blocks")
    if r.status_code == 200:
        blocks = r.json()
        print(f"  Block data received ({len(json.dumps(blocks))} bytes)")
        return blocks
    else:
        print(f"  Error: {r.status_code} {r.text[:200]}")
        return None


def step5_assign_role(client, user_data, role):
    """Assign a role to a virtual user via the choose_role block."""
    print(f"\n=== Assign Role: {role} ===")

    # Login as this user first
    step3_login_as_user(client, user_data)

    # Get blocks to see current state
    blocks = step4_get_policy_blocks(client)
    if blocks:
        print(f"  Current block: {blocks.get('blockType', '?')} [{blocks.get('tag', '')}]")

    # Post role selection to choose_role block
    r = client.post(f"/policies/{POLICY_ID}/tag/choose_role/blocks", json_data={
        "role": role
    })
    print(f"  Role assignment: {r.status_code}")
    if r.status_code == 200:
        print(f"  Response: {json.dumps(r.json(), indent=2)[:300]}")
        return True
    else:
        print(f"  Error: {r.text[:300]}")
        return False


def step6_facility_registration(client, facility_user):
    """Submit a facility registration as the Facility user."""
    print("\n=== Step 6: Facility Registration ===")

    # Login as Facility
    step3_login_as_user(client, facility_user)

    # Check what blocks are visible
    blocks = step4_get_policy_blocks(client)
    if blocks:
        def show_blocks(b, d=0):
            tag = b.get('tag', '')
            bt = b.get('blockType', '?')
            if tag:
                print(f"  {'  '*d}{bt} [{tag}]")
            for c in b.get('children', []):
                show_blocks(c, d+1)
        show_blocks(blocks)

    # Submit facility registration
    registration_data = {
        "document": {
            "facilityId": "KNP-TAN-001",
            "facilityName": "Kanpur Jajmau Tannery Unit 1",
            "industryCategory": "tannery",
            "state": "Uttar Pradesh",
            "district": "Kanpur Nagar",
            "gpsLatitude": 26.4499,
            "gpsLongitude": 80.3319,
            "ocemsSensorModel": "Horiba ENDA-600ZG",
            "analyzerSerialNumber": "ENDA-2024-KNP-001",
            "ctoNumber": "UP/2025/TAN/1234",
            "ctoValidUntil": "2027-12-31",
            "ctoDischargeMode": "discharge",
            "ctoBODLimit": 0,
            "ctoCODLimit": 0,
            "ctoTSSLimit": 0,
            "deviceKmsKeyId": "907fbc7e-3555-46e9-a8b0-dbdf9b84d35b",
            "deviceHederaAccountId": "0.0.8148249"
        },
        "ref": None
    }

    print("\n  Submitting registration...")
    r = client.post(f"/policies/{POLICY_ID}/tag/facility_registration_form/blocks", json_data=registration_data)
    print(f"  Registration response: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()
        print(f"  Response: {json.dumps(resp, indent=2)[:500]}")
        return True
    else:
        print(f"  Error: {r.text[:500]}")
        return False


def step7_spcb_approve(client, spcb_user):
    """SPCB approves the facility registration."""
    print("\n=== Step 7: SPCB Approval ===")

    # Login as SPCB
    step3_login_as_user(client, spcb_user)

    # Get the registrations grid
    r = client.get(f"/policies/{POLICY_ID}/tag/registrations_grid/blocks")
    print(f"  Registrations grid: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"  Grid data: {json.dumps(data, indent=2)[:500]}")

    # Click approve button
    r = client.post(f"/policies/{POLICY_ID}/tag/approve_registration_btn/blocks", json_data={
        "tag": "Option_0"  # Approve
    })
    print(f"  Approve response: {r.status_code}")
    if r.status_code == 200:
        print(f"  Response: {json.dumps(r.json(), indent=2)[:300]}")
        return True
    else:
        print(f"  Error: {r.text[:300]}")
        return False


def step8_submit_sensor_data(client, iot_user):
    """IoT service submits sensor reading via externalDataBlock."""
    print("\n=== Step 8: Submit Sensor Data ===")

    # Login as IoT
    step3_login_as_user(client, iot_user)

    # Submit a compliant reading
    compliant_reading = {
        "document": {
            "timestamp": "2026-03-11T12:00:00Z",
            "facilityId": "KNP-TAN-001",
            "pH": 7.2,
            "BOD_mgL": 22,
            "COD_mgL": 180,
            "TSS_mgL": 65,
            "temperature_C": 32,
            "totalChromium_mgL": 1.2,
            "hexChromium_mgL": 0.05,
            "oilAndGrease_mgL": 5,
            "ammoniacalN_mgL": 20,
            "dissolvedOxygen_mgL": 6.5,
            "flow_KLD": 450,
            "sensorStatus": "online",
            "kmsKeyId": "907fbc7e-3555-46e9-a8b0-dbdf9b84d35b",
            "kmsSigHash": "0x3a8f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a"
        },
        "ref": None
    }

    print("  Submitting compliant reading...")
    r = client.post(f"/policies/{POLICY_ID}/tag/sensor_data_intake/blocks", json_data=compliant_reading)
    print(f"  Sensor data response: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()
        print(f"  Response: {json.dumps(resp, indent=2)[:500]}")
    else:
        print(f"  Error: {r.text[:500]}")

    # Submit a violation reading (COD > 250)
    violation_reading = {
        "document": {
            "timestamp": "2026-03-11T12:15:00Z",
            "facilityId": "KNP-TAN-001",
            "pH": 4.8,
            "BOD_mgL": 45,
            "COD_mgL": 420,
            "TSS_mgL": 155,
            "temperature_C": 38,
            "totalChromium_mgL": 3.5,
            "hexChromium_mgL": 0.15,
            "oilAndGrease_mgL": 12,
            "ammoniacalN_mgL": 55,
            "dissolvedOxygen_mgL": 2.1,
            "flow_KLD": 680,
            "sensorStatus": "online",
            "kmsKeyId": "907fbc7e-3555-46e9-a8b0-dbdf9b84d35b",
            "kmsSigHash": "0x4b9f0c3d2e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b1c"
        },
        "ref": None
    }

    print("\n  Submitting violation reading...")
    r = client.post(f"/policies/{POLICY_ID}/tag/sensor_data_intake/blocks", json_data=violation_reading)
    print(f"  Violation data response: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()
        print(f"  Response: {json.dumps(resp, indent=2)[:500]}")
    else:
        print(f"  Error: {r.text[:500]}")

    return True


def step9_check_transactions(client):
    """Check dry-run transactions to verify what happened."""
    print("\n=== Step 9: Check Dry Run Transactions ===")

    r = client.get(f"/policies/{POLICY_ID}/dry-run/transactions")
    print(f"  Transactions: {r.status_code}")
    if r.status_code == 200:
        txs = r.json()
        if isinstance(txs, list):
            print(f"  Total transactions: {len(txs)}")
            for tx in txs[:20]:
                print(f"    {tx.get('type', '?')} | {tx.get('createDate', '?')}")
        else:
            print(f"  Response: {json.dumps(txs, indent=2)[:1000]}")
    else:
        print(f"  Error: {r.text[:300]}")


def step10_check_artifacts(client):
    """Check dry-run artifacts (documents created)."""
    print("\n=== Step 10: Check Dry Run Artifacts ===")

    r = client.get(f"/policies/{POLICY_ID}/dry-run/artifacts")
    print(f"  Artifacts: {r.status_code}")
    if r.status_code == 200:
        arts = r.json()
        if isinstance(arts, list):
            print(f"  Total artifacts: {len(arts)}")
            for a in arts[:10]:
                print(f"    {a.get('type', '?')} | {a.get('schema', '?')} | {a.get('createDate', '?')}")
        else:
            print(f"  Response: {json.dumps(arts, indent=2)[:1000]}")
    else:
        print(f"  Error: {r.text[:300]}")


def main():
    client = MGSClient()
    client.authenticate()

    # Step 1: Start dry run
    if not step1_start_dry_run(client):
        print("\nFAILED: Could not start dry run")
        sys.exit(1)

    # Step 2: Create virtual users (4 — one per role)
    raw_users = step2_create_virtual_users(client)

    # Get user list
    r = client.get(f"/policies/{POLICY_ID}/dry-run/users")
    all_users = r.json() if r.status_code == 200 else []
    print(f"\n  All users: {json.dumps(all_users, indent=2)[:1000]}")

    if len(all_users) < 4:
        print(f"  WARNING: Only {len(all_users)} users created, need 4")

    # Step 5: Assign roles
    # Users are indexed - first created is index 0
    # We need to assign each user to a role
    for i, role in enumerate(["Facility", "SPCB", "VVB", "IoT"]):
        if i < len(all_users):
            user = all_users[i]
            # Skip the Standard Registry user
            if user.get('role') == 'STANDARD_REGISTRY':
                print(f"  Skipping Standard Registry user")
                continue
            step5_assign_role(client, user, role)
            time.sleep(2)

    # Re-fetch users to see roles assigned
    r = client.get(f"/policies/{POLICY_ID}/dry-run/users")
    all_users = r.json() if r.status_code == 200 else []
    print(f"\n  Users after role assignment:")
    for u in all_users:
        print(f"    {u.get('username', '?')} | role={u.get('role', '?')}")

    # Find users by role
    facility_user = next((u for u in all_users if u.get('role') == 'Facility'), None)
    spcb_user = next((u for u in all_users if u.get('role') == 'SPCB'), None)
    iot_user = next((u for u in all_users if u.get('role') == 'IoT'), None)

    # Step 6: Facility registration
    if facility_user:
        step6_facility_registration(client, facility_user)
        time.sleep(3)
    else:
        print("  No Facility user found")

    # Step 7: SPCB approval
    if spcb_user:
        step7_spcb_approve(client, spcb_user)
        time.sleep(3)
    else:
        print("  No SPCB user found")

    # Step 8: IoT sensor data
    if iot_user:
        step8_submit_sensor_data(client, iot_user)
        time.sleep(3)
    else:
        print("  No IoT user found")

    # Step 9-10: Check results
    step9_check_transactions(client)
    step10_check_artifacts(client)

    print("\n=== Dry Run Test Complete ===")


if __name__ == "__main__":
    main()
