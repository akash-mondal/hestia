#!/usr/bin/env python3
"""
Compliance evaluation middleware for Zeno Guardian dMRV.

Reads SensorReading VCs from Guardian, runs CPCB Schedule-VI compliance
evaluation, and submits ComplianceEvaluation VCs back to Guardian.

This middleware bridges the gap between sensor data submission and
compliance evaluation, running the same logic that would be in-policy
if customLogicBlock supported event-triggered execution.

Usage:
  python3 middleware-compliance.py              # Process all unprocessed readings
  python3 middleware-compliance.py --continuous  # Watch for new readings every 10s
"""
import requests
import json
import time
import sys

GUARDIAN_URL = "http://165.22.212.120:3000/api/v1"
POLICY_ID = "69bbb6b2b17ff3040769aaa8"
USERNAME = "akash"
PASSWORD = "Akash@17327"

# Track which readings we've already processed
processed_ids = set()


def auth():
    r = requests.post(f"{GUARDIAN_URL}/accounts/login",
                      json={"username": USERNAME, "password": PASSWORD})
    refresh = r.json()["refreshToken"]
    r = requests.post(f"{GUARDIAN_URL}/accounts/access-token",
                      json={"refreshToken": refresh})
    return r.json()["accessToken"]


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def evaluate_compliance(cs):
    """
    Run CPCB Schedule-VI compliance evaluation on a SensorReading credentialSubject.
    Returns ComplianceEvaluation fields.
    """
    violation_count = 0
    critical_count = 0

    pH = cs.get("field2", 0) or 0
    BOD = cs.get("field3", 0) or 0
    COD = cs.get("field4", 0) or 0
    TSS = cs.get("field5", 0) or 0
    temp = cs.get("field6", 0) or 0
    Cr = cs.get("field7", 0) or 0

    pH_ok = 5.5 <= pH <= 9.0
    BOD_ok = BOD <= 30
    COD_ok = COD <= 250
    TSS_ok = TSS <= 100
    temp_ok = temp <= 40
    Cr_ok = Cr <= 2.0

    if not pH_ok:
        violation_count += 1
    if not BOD_ok:
        violation_count += 1
        if BOD > 45:
            critical_count += 1
    if not COD_ok:
        violation_count += 1
        if COD > 375:
            critical_count += 1
    if not TSS_ok:
        violation_count += 1
        if TSS > 150:
            critical_count += 1
    if not temp_ok:
        violation_count += 1
    if not Cr_ok:
        violation_count += 1
        if Cr > 3.0:
            critical_count += 1

    overall = violation_count == 0

    if overall:
        action = "mint_ggcc"
    elif critical_count > 0:
        action = "mint_violation_nft"
    else:
        action = "pending_review"

    return {
        "field0": f"EVAL-{int(time.time() * 1000)}",
        "field1": cs.get("field1", ""),
        "field2": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "field3": "schedule_vi",
        "field4": False,
        "field5": pH_ok,
        "field6": pH,
        "field7": BOD_ok,
        "field8": BOD,
        "field9": COD_ok,
        "field10": COD,
        "field11": TSS_ok,
        "field12": TSS,
        "field13": temp_ok,
        "field14": temp,
        "field15": Cr_ok,
        "field16": Cr,
        "field17": overall,
        "field18": violation_count,
        "field19": critical_count,
        "field20": action,
    }


def get_sensor_readings(token):
    """Get all SensorReading VCs from monitor grid."""
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/monitor_grid/blocks",
                     headers=headers(token))
    if r.status_code != 200:
        return []
    data = r.json()
    return data.get("data", []) if isinstance(data, dict) else data


def submit_evaluation(token, evaluation):
    """Submit a ComplianceEvaluation VC to Guardian."""
    r = requests.post(
        f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/compliance_evaluation_intake/blocks",
        headers=headers(token),
        json={"document": evaluation, "ref": None},
    )
    return r.status_code in [200, 201], r


def process_readings(token, iot_did, spcb_did):
    """Process all unprocessed sensor readings."""
    # Step 1: Login as SPCB to read sensor readings from monitor grid
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(0.5)

    readings = get_sensor_readings(token)
    if not readings:
        return 0, 0

    # Collect evaluations to submit
    evaluations = []
    for reading in readings:
        doc_id = reading.get("id", "")
        if doc_id in processed_ids:
            continue

        cs = reading.get("document", {}).get("credentialSubject", [{}])
        if isinstance(cs, list):
            cs = cs[0] if cs else {}

        evaluation = evaluate_compliance(cs)
        evaluations.append((doc_id, cs, evaluation))

    if not evaluations:
        return 0, 0

    # Step 2: Login as IoT to submit compliance evaluations
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": iot_did})
    time.sleep(0.5)

    new_count = 0
    ok_count = 0

    for doc_id, cs, evaluation in evaluations:
        ok, resp = submit_evaluation(token, evaluation)
        status = "OK" if ok else f"FAIL({resp.status_code})"

        facility = cs.get("field1", "?")
        action = evaluation["field20"]
        violations = evaluation["field18"]
        print(f"  {facility} | violations={violations} | action={action:>20} | {status}")
        if not ok:
            print(f"    Error: {resp.text[:200]}")

        if ok:
            ok_count += 1
        processed_ids.add(doc_id)
        new_count += 1
        time.sleep(2)

    return new_count, ok_count


def main():
    token = auth()
    print("Authenticated")

    # We need an IoT user to submit evaluations and an SPCB user to read readings
    # Create a dedicated IoT user for the middleware
    r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                      headers={"Authorization": f"Bearer {token}"})
    users = r.json()
    middleware_user = users[-1] if isinstance(users, list) else users
    middleware_did = middleware_user["did"]
    print(f"Middleware user: {middleware_did[:50]}...")

    # Assign IoT role
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": middleware_did})
    time.sleep(1)
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/choose_role/blocks",
                  headers=headers(token), json={"role": "IoT"})
    time.sleep(3)
    print("Middleware user assigned IoT role")

    # Also need an SPCB user to read the monitor grid
    r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                      headers={"Authorization": f"Bearer {token}"})
    users = r.json()
    spcb_user = users[-1] if isinstance(users, list) else users
    spcb_did = spcb_user["did"]
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(1)
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/choose_role/blocks",
                  headers=headers(token), json={"role": "SPCB"})
    time.sleep(3)
    print("SPCB reader user created")

    # Login as SPCB to read monitor grid
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(1)

    if "--continuous" in sys.argv:
        print("\nContinuous mode — watching for new readings...\n")
        while True:
            new, ok = process_readings(token, middleware_did, spcb_did)
            if new > 0:
                print(f"  Processed {ok}/{new} new readings")
            time.sleep(10)
    else:
        print("\nProcessing all sensor readings...\n")
        new, ok = process_readings(token, middleware_did, spcb_did)
        print(f"\nDone: {ok}/{new} evaluations submitted")

        # Verify: check evaluations grid
        print("\nVerifying evaluations grid...")
        requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                      headers=headers(token), json={"did": spcb_did})
        time.sleep(2)
        r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/evaluations_grid/blocks",
                         headers=headers(token))
        if r.status_code == 200:
            data = r.json()
            docs = data.get("data", []) if isinstance(data, dict) else data
            print(f"Evaluations in grid: {len(docs)}")
            for d in docs:
                cs = d.get("document", {}).get("credentialSubject", [{}])
                if isinstance(cs, list):
                    cs = cs[0] if cs else {}
                print(f"  {cs.get('field1','?'):>15} | overall={str(cs.get('field17','?')):>5} | "
                      f"violations={cs.get('field18','?')} | action={cs.get('field20','?')}")


if __name__ == "__main__":
    main()
