#!/usr/bin/env python3
"""
Test the Zeno Guardian dMRV policy dry-run workflow.

Tests: virtual user creation, role assignment, facility registration,
SPCB approval, IoT sensor data submission (multiple readings), and
SPCB monitor grid verification.

Usage:
  python3 guardian/scripts/test-dry-run.py
"""
import requests
import json
import time
import sys

GUARDIAN_URL = "http://165.22.212.120:3000/api/v1"
POLICY_ID = "69bbb6b2b17ff3040769aaa8"


def auth():
    r = requests.post(f"{GUARDIAN_URL}/accounts/login",
                      json={"username": "akash", "password": "Akash@17327"})
    refresh = r.json()["refreshToken"]
    r = requests.post(f"{GUARDIAN_URL}/accounts/access-token",
                      json={"refreshToken": refresh})
    return r.json()["accessToken"]


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def post_tag(token, tag, data):
    r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/{tag}/blocks",
                      headers=headers(token), json=data)
    if r.status_code not in [200, 201]:
        print(f"  ERROR POST {tag}: {r.status_code} {r.text[:200]}")
        return None
    try:
        return r.json()
    except Exception:
        return {"_ok": True}


def get_tag(token, tag):
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/{tag}/blocks",
                     headers=headers(token))
    return r.json() if r.status_code == 200 else None


def step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def main():
    token = auth()
    print("Authenticated")

    # Check policy status
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token))
    status = r.json().get("status")
    print(f"Policy status: {status}")

    if status != "DRY-RUN":
        print("Starting dry-run...")
        r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run",
                         headers={"Authorization": f"Bearer {token}"})
        time.sleep(5)
    else:
        # Reset dry-run for clean test
        print("Resetting dry-run...")
        r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}/draft",
                         headers={"Authorization": f"Bearer {token}"})
        time.sleep(3)
        r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run",
                         headers={"Authorization": f"Bearer {token}"})
        time.sleep(5)

    # ── Create virtual users ──
    step("Creating 3 virtual users")
    users = []
    for name in ["Facility", "SPCB", "IoT"]:
        r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                          headers={"Authorization": f"Bearer {token}"})
        user = r.json()[-1] if isinstance(r.json(), list) else r.json()
        print(f"  {name}: {user['did'][:50]}...")
        users.append(user["did"])
        time.sleep(2)
    facility_did, spcb_did, iot_did = users

    # ── Facility registration ──
    step("Facility: register")
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": facility_did})
    time.sleep(1)
    post_tag(token, "choose_role", {"role": "Facility"})
    time.sleep(3)

    reg = post_tag(token, "facility_registration_form", {
        "document": {
            "field0": "KNP-TAN-001",
            "field1": "Kanpur Jajmau Tannery Complex Unit 1",
            "field2": "tannery",
            "field3": "Uttar Pradesh",
            "field4": "Kanpur Nagar",
            "field5": 26.4499,
            "field6": 80.3319,
            "field7": "Horiba ENDA-600ZG",
            "field8": "HRB-2024-KNP-0147",
            "field9": "UPPCB/CTO/2024/KNP/1847",
            "field10": "2027-03-31",
            "field11": "discharge",
            "field12": 20,
            "field13": 150,
            "field14": 80,
            "field15": "arn:aws:kms:us-east-1:123456789:key/907fbc7e",
            "field16": "0.0.8148249"
        },
        "ref": None
    })
    print(f"  Registration: {'OK' if reg else 'FAILED'}")
    time.sleep(5)

    # ── SPCB approval ──
    step("SPCB: check + approve")
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(1)
    post_tag(token, "choose_role", {"role": "SPCB"})
    time.sleep(3)

    reg_grid = get_tag(token, "registrations_grid")
    reg_count = len(reg_grid.get("data", [])) if reg_grid else 0
    print(f"  Registrations visible: {reg_count}")

    if reg_count > 0:
        doc_id = reg_grid["data"][0]["id"]
        print(f"  Document ID: {doc_id}")
        approve = post_tag(token, "approve_registration_btn",
                           {"documentId": doc_id, "dialogResult": "Approved"})
        print(f"  Approval: {'sent' if approve else 'failed'}")
        time.sleep(3)
        # Verify status changed
        reg_check = get_tag(token, "registrations_grid")
        if reg_check and reg_check.get("data"):
            new_status = reg_check["data"][0].get("option", {}).get("status", "?")
            print(f"  Status after approval: {new_status}")

    # ── Token association (VM0033 step 2) ──
    step("Token association for IoT user")
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": iot_did})
    time.sleep(1)
    post_tag(token, "choose_role", {"role": "IoT"})
    time.sleep(3)

    # Associate GGCC and ZVIOL tokens (like VM0033 PUT /tokens/{id}/associate)
    for tok_id, tok_name in [("0.0.8182260", "GGCC"), ("0.0.8182266", "ZVIOL")]:
        r = requests.put(f"{GUARDIAN_URL}/tokens/{tok_id}/associate",
                         headers={"Authorization": f"Bearer {token}"})
        status = "OK" if r.status_code in [200, 201] else f"skip ({r.status_code})"
        print(f"  {tok_name} ({tok_id}): {status}")
    time.sleep(2)

    # ── IoT sensor readings ──
    step("IoT: submit 5 sensor readings")

    # Mix of compliant and violation readings
    readings = [
        ("2026-03-12T09:00:00Z", 7.2, 18.5, 145, 62, 32, 0.8, "Compliant"),
        ("2026-03-12T09:15:00Z", 4.8, 52.0, 410, 165, 38, 3.5, "VIOLATION"),
        ("2026-03-12T09:30:00Z", 6.8, 25.0, 180, 70, 33, 1.2, "Compliant"),
        ("2026-03-12T09:45:00Z", 5.2, 35.0, 290, 110, 42, 2.5, "Violation"),
        ("2026-03-12T10:00:00Z", 7.5, 15.0, 120, 45, 30, 0.5, "Compliant"),
    ]

    ok_count = 0
    for i, (ts, ph, bod, cod, tss, temp, cr, label) in enumerate(readings):
        result = post_tag(token, "sensor_data_intake", {
            "document": {
                "field0": ts,
                "field1": "KNP-TAN-001",
                "field2": ph,
                "field3": bod,
                "field4": cod,
                "field5": tss,
                "field6": temp,
                "field7": cr,
                "field8": 0.04,
                "field9": 4.2,
                "field10": 22.0,
                "field11": 5.1,
                "field12": 450.0,
                "field13": "online",
                "field14": "arn:aws:kms:us-east-1:123456789:key/907fbc7e",
                "field15": f"sig_{i}_abcdef1234567890abcdef1234567890"
            },
            "ref": None
        })
        status = "OK" if result else "FAIL"
        if result:
            ok_count += 1
        print(f"  #{i+1} [{label:>10}] pH={ph:<4} BOD={bod:<5} COD={cod:<4} → {status}")
        time.sleep(5)

    # ── Run compliance middleware ──
    step("Compliance middleware: evaluate all readings")

    # Create middleware IoT user
    r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                      headers={"Authorization": f"Bearer {token}"})
    mw_user = r.json()[-1] if isinstance(r.json(), list) else r.json()
    mw_did = mw_user["did"]
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": mw_did})
    time.sleep(1)
    post_tag(token, "choose_role", {"role": "IoT"})
    time.sleep(3)

    # Read sensor readings (as SPCB)
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(1)
    monitor = get_tag(token, "monitor_grid")
    sr_data = monitor.get("data", []) if monitor else []

    # Evaluate and submit (as middleware IoT user)
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": mw_did})
    time.sleep(1)

    eval_ok = 0
    for d in sr_data:
        cs = d.get("document", {}).get("credentialSubject", [{}])
        if isinstance(cs, list):
            cs = cs[0] if cs else {}

        # Run CPCB Schedule-VI compliance
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

        viol = sum(1 for x in [pH_ok, BOD_ok, COD_ok, TSS_ok, temp_ok, Cr_ok] if not x)
        crit = sum(1 for val, lim in [(BOD, 45), (COD, 375), (TSS, 150), (Cr, 3.0)]
                   if val > lim)
        overall = viol == 0
        action = "mint_ggcc" if overall else ("mint_violation_nft" if crit > 0 else "pending_review")

        ce_doc = {
            "document": {
                "field0": f"EVAL-{int(time.time()*1000)}", "field1": cs.get("field1", ""),
                "field2": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "field3": "schedule_vi",
                "field4": False,
                "field5": pH_ok, "field6": pH, "field7": BOD_ok, "field8": BOD,
                "field9": COD_ok, "field10": COD, "field11": TSS_ok, "field12": TSS,
                "field13": temp_ok, "field14": temp, "field15": Cr_ok, "field16": Cr,
                "field17": overall, "field18": viol, "field19": crit, "field20": action,
            },
            "ref": None,
        }
        result = post_tag(token, "compliance_evaluation_intake", ce_doc)
        status = "OK" if result else "FAIL"
        if result:
            eval_ok += 1
        print(f"  pH={pH:<4} viol={viol} action={action:>20} → {status}")
        time.sleep(2)

    # ── Check results ──
    step(f"Results ({ok_count}/{len(readings)} readings, {eval_ok}/{len(sr_data)} evaluations)")
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": spcb_did})
    time.sleep(2)

    monitor = get_tag(token, "monitor_grid")
    if monitor:
        data = monitor.get("data", [])
        print(f"\n  SENSOR READINGS MONITOR: {len(data)} documents")
        print(f"  {'Time':<25} {'Facility':<15} {'pH':>5} {'BOD':>5} {'COD':>5} {'TSS':>5} {'Temp':>5} {'Cr':>5}")
        print(f"  {'-'*85}")
        for d in data:
            cs = d.get("document", {}).get("credentialSubject", [{}])
            if isinstance(cs, list):
                cs = cs[0] if cs else {}
            print(f"  {str(cs.get('field0','')):<25} {str(cs.get('field1','')):<15} "
                  f"{str(cs.get('field2',''))[:5]:>5} {str(cs.get('field3',''))[:5]:>5} "
                  f"{str(cs.get('field4',''))[:5]:>5} {str(cs.get('field5',''))[:5]:>5} "
                  f"{str(cs.get('field6',''))[:5]:>5} {str(cs.get('field7',''))[:5]:>5}")

    # Compliance evaluations
    evals = get_tag(token, "evaluations_grid")
    eval_count = 0
    if evals:
        eval_data = evals.get("data", [])
        eval_count = len(eval_data)
        print(f"\n  COMPLIANCE EVALUATIONS: {eval_count} documents")
        print(f"  {'Facility':<15} {'Overall':>7} {'Viol':>5} {'Action':>20} {'pH':>4} {'BOD':>4} {'COD':>4} {'TSS':>4} {'Cr':>4}")
        print(f"  {'-'*85}")
        for d in eval_data:
            cs = d.get("document", {}).get("credentialSubject", [{}])
            if isinstance(cs, list):
                cs = cs[0] if cs else {}
            print(f"  {str(cs.get('field1','')):<15} {str(cs.get('field17','')):>7} "
                  f"{str(cs.get('field18','')):>5} {str(cs.get('field20','')):>20} "
                  f"{str(cs.get('field5','')):>4} {str(cs.get('field7','')):>4} "
                  f"{str(cs.get('field9','')):>4} {str(cs.get('field11','')):>4} "
                  f"{str(cs.get('field15','')):>4}")

    regs = get_tag(token, "registrations_grid")
    if regs:
        data = regs.get("data", [])
        print(f"\n  FACILITY REGISTRATIONS: {len(data)} documents")
        for d in data:
            cs = d.get("document", {}).get("credentialSubject", [{}])
            if isinstance(cs, list):
                cs = cs[0] if cs else {}
            st = d.get("option", {}).get("status", "N/A")
            print(f"    {cs.get('field1', 'N/A')} | {cs.get('field2', 'N/A')} | status={st}")

    # Dry-run stats
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/transactions",
                     headers={"Authorization": f"Bearer {token}"})
    txns = r.json() if r.status_code == 200 else []
    tx_list = txns if isinstance(txns, list) else txns.get("data", [])
    tx_count = len(tx_list)

    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/artifacts",
                     headers={"Authorization": f"Bearer {token}"})
    arts = r.json() if r.status_code == 200 else []
    art_count = len(arts) if isinstance(arts, list) else len(arts.get("data", []))

    reading_count = len(monitor.get("data", [])) if monitor else 0
    reg_count_final = len(regs.get("data", [])) if regs else 0

    # Transaction type breakdown
    from collections import Counter
    tx_types = Counter(t.get("type", "?") for t in tx_list)
    mint_count = tx_types.get("TokenMintTransaction", 0)
    nft_mint_count = tx_types.get("TokenMintNFTTransaction", 0)

    print(f"\n  DRY-RUN STATS:")
    print(f"    Transactions: {tx_count}")
    print(f"    Artifacts: {art_count}")
    print(f"    Transaction breakdown:")
    for t, c in tx_types.most_common():
        print(f"      {t}: {c}")

    # Count VP documents (trust chain bundles)
    vp_count = 0
    for a in (arts if isinstance(arts, list) else []):
        doc = a.get("document", {})
        if isinstance(doc.get("type", []), list) and "VerifiablePresentation" in doc.get("type", []):
            vp_count += 1

    print(f"\n  MINTING & TRUST CHAIN:")
    print(f"    GGCC mints (fungible): {mint_count}")
    print(f"    ZVIOL mints (NFT): {nft_mint_count}")
    print(f"    VP bundles (trust chain): {vp_count}")

    print(f"\n{'='*60}")
    has_mints = mint_count > 0 or nft_mint_count > 0
    success = ok_count >= 3 and reading_count >= 3 and eval_count >= 3 and has_mints
    print(f"  GUARDIAN DRY-RUN: {'SUCCESS' if success else 'PARTIAL'}")
    print(f"  Readings submitted: {ok_count}/{len(readings)}")
    print(f"  Readings in monitor: {reading_count}")
    print(f"  Evaluations: {eval_count}")
    print(f"  Registrations: {reg_count_final}")
    print(f"  Token minting: {'WORKING' if has_mints else 'NOT WORKING'}")
    print(f"  Trust chain VPs: {vp_count}")
    print(f"{'='*60}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
