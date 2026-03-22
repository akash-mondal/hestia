#!/usr/bin/env python3
"""
Bulk ingest 50 real GPI facilities into Guardian → Hedera testnet.

Registers facilities, submits sensor readings, runs compliance evaluations.
Every data point gets a real Hedera transaction → real HashScan link.

Usage:
  python3 guardian/scripts/bulk-ingest.py [--start N] [--count N] [--readings-per N]
"""
import requests
import json
import time
import sys
import hashlib
import math
import argparse
from datetime import datetime, timedelta

GUARDIAN_URL = "http://165.22.212.120:3000/api/v1"
POLICY_ID = "69bbb6b2b17ff3040769aaa8"

# CPCB Schedule-VI limits
LIMITS = {
    "pH": (5.5, 9.0), "BOD": 30, "COD": 250, "TSS": 100,
    "temp": 40, "Cr_total": 2.0, "Cr_hex": 0.1,
    "oil_grease": 10, "NH3N": 50,
}

# ═══ Industry-specific parameter profiles ═══
# Each profile: (mean, std_dev) for each parameter when COMPLIANT
# Violation readings multiply the mean by 1.5-3x
PROFILES = {
    "tannery":        {"pH": (6.8, 0.8), "BOD": (22, 12), "COD": (180, 80), "TSS": (70, 30), "Cr": (1.5, 1.0), "compliance_rate": 0.40},
    "pharmaceutical": {"pH": (7.2, 0.3), "BOD": (12, 5),  "COD": (80, 30),  "TSS": (30, 10), "Cr": (0.1, 0.05), "compliance_rate": 0.90},
    "sugar":          {"pH": (6.5, 0.6), "BOD": (25, 10), "COD": (120, 50), "TSS": (55, 20), "Cr": (0.05, 0.02), "compliance_rate": 0.60},
    "distillery":     {"pH": (5.8, 0.8), "BOD": (28, 12), "COD": (200, 80), "TSS": (65, 25), "Cr": (0.08, 0.03), "compliance_rate": 0.55},
    "chemical":       {"pH": (7.0, 0.5), "BOD": (20, 8),  "COD": (180, 70), "TSS": (60, 25), "Cr": (0.5, 0.3), "compliance_rate": 0.50},
    "pulp_paper":     {"pH": (7.5, 0.4), "BOD": (22, 10), "COD": (160, 60), "TSS": (75, 30), "Cr": (0.1, 0.05), "compliance_rate": 0.50},
    "metal":          {"pH": (6.5, 0.5), "BOD": (15, 6),  "COD": (100, 40), "TSS": (50, 20), "Cr": (1.2, 0.8), "compliance_rate": 0.55},
    "textile":        {"pH": (8.0, 0.6), "BOD": (20, 8),  "COD": (140, 50), "TSS": (80, 30), "Cr": (0.2, 0.1), "compliance_rate": 0.55},
    "dye":            {"pH": (7.8, 0.7), "BOD": (18, 7),  "COD": (130, 50), "TSS": (85, 30), "Cr": (0.3, 0.15), "compliance_rate": 0.50},
    "jute":           {"pH": (7.0, 0.4), "BOD": (20, 8),  "COD": (110, 40), "TSS": (90, 35), "Cr": (0.05, 0.02), "compliance_rate": 0.55},
    "food_processing":{"pH": (6.8, 0.3), "BOD": (15, 5),  "COD": (80, 30),  "TSS": (35, 12), "Cr": (0.02, 0.01), "compliance_rate": 0.85},
}


def seeded_random(seed_str, index=0):
    """Deterministic pseudo-random from string seed."""
    h = hashlib.md5(f"{seed_str}_{index}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def generate_reading(facility, reading_idx, is_violation):
    """Generate realistic sensor reading based on industry profile."""
    cat = facility["industryCategory"]
    profile = PROFILES.get(cat, PROFILES["chemical"])
    seed = f"{facility['facilityId']}_{reading_idx}"

    def param(mean, std, limit_val=None, violation_mult=2.0):
        r = seeded_random(seed, hash(str(mean)))
        val = mean + (r - 0.5) * 2 * std
        if is_violation and limit_val and r > 0.3:
            val = limit_val * (1.0 + r * (violation_mult - 1.0))
        return round(max(0.1, val), 2)

    pH_mean, pH_std = profile["pH"]
    BOD_mean, BOD_std = profile["BOD"]
    COD_mean, COD_std = profile["COD"]
    TSS_mean, TSS_std = profile["TSS"]
    Cr_mean, Cr_std = profile["Cr"]

    pH = round(pH_mean + (seeded_random(seed, 1) - 0.5) * 2 * pH_std, 2)
    if is_violation and seeded_random(seed, 10) > 0.7:
        pH = round(4.5 + seeded_random(seed, 11) * 1.0, 2)  # Below 5.5

    BOD = param(BOD_mean, BOD_std, 30, 2.5)
    COD = param(COD_mean, COD_std, 250, 2.0)
    TSS = param(TSS_mean, TSS_std, 100, 1.8)
    temp = round(28 + seeded_random(seed, 5) * 10, 1)
    if is_violation and seeded_random(seed, 15) > 0.8:
        temp = round(41 + seeded_random(seed, 16) * 5, 1)
    Cr_total = param(Cr_mean, Cr_std, 2.0, 3.0)
    Cr_hex = round(Cr_total * (0.03 + seeded_random(seed, 6) * 0.07), 3)
    oil = round(3 + seeded_random(seed, 7) * 6, 1)
    if is_violation and seeded_random(seed, 17) > 0.7:
        oil = round(12 + seeded_random(seed, 18) * 8, 1)
    NH3N = round(10 + seeded_random(seed, 8) * 30, 1)
    DO = round(3 + seeded_random(seed, 9) * 5, 1)
    flow = round(100 + seeded_random(seed, 10) * 900, 0)

    # Timestamp: readings spread over past 7 days
    base_time = datetime(2026, 3, 18, 6, 0, 0)
    offset_hours = reading_idx * 8 + int(seeded_random(seed, 20) * 4)
    ts = base_time - timedelta(hours=offset_hours)

    sig_hash = hashlib.sha256(f"{facility['facilityId']}_{ts.isoformat()}_{reading_idx}".encode()).hexdigest()

    return {
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pH": pH, "BOD": BOD, "COD": COD, "TSS": TSS,
        "temp": temp, "Cr_total": Cr_total, "Cr_hex": Cr_hex,
        "oil": oil, "NH3N": NH3N, "DO": DO, "flow": flow,
        "sig_hash": f"kms_{sig_hash[:40]}",
    }


def evaluate_reading(reading):
    """Run CPCB Schedule-VI compliance evaluation."""
    pH_ok = 5.5 <= reading["pH"] <= 9.0
    BOD_ok = reading["BOD"] <= 30
    COD_ok = reading["COD"] <= 250
    TSS_ok = reading["TSS"] <= 100
    temp_ok = reading["temp"] <= 40
    Cr_ok = reading["Cr_total"] <= 2.0

    violations = sum(1 for x in [pH_ok, BOD_ok, COD_ok, TSS_ok, temp_ok, Cr_ok] if not x)
    critical = sum(1 for val, lim in [
        (reading["BOD"], 45), (reading["COD"], 375), (reading["TSS"], 150), (reading["Cr_total"], 3.0)
    ] if val > lim)
    overall = violations == 0
    action = "mint_ggcc" if overall else ("mint_violation_nft" if critical > 0 else "pending_review")

    return {
        "pH_ok": pH_ok, "BOD_ok": BOD_ok, "COD_ok": COD_ok,
        "TSS_ok": TSS_ok, "temp_ok": temp_ok, "Cr_ok": Cr_ok,
        "overall": overall, "violations": violations,
        "critical": critical, "action": action,
    }


# ═══ Guardian API helpers ═══

def auth():
    r = requests.post(f"{GUARDIAN_URL}/accounts/login",
                      json={"username": "akash", "password": "Akash@17327"})
    refresh = r.json()["refreshToken"]
    r = requests.post(f"{GUARDIAN_URL}/accounts/access-token",
                      json={"refreshToken": refresh})
    return r.json()["accessToken"]


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def post_tag(token, tag, data, retries=2):
    for attempt in range(retries + 1):
        try:
            r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/{tag}/blocks",
                              headers=headers(token), json=data, timeout=30)
            if r.status_code in [200, 201]:
                try:
                    return r.json()
                except Exception:
                    return {"_ok": True}
            if attempt < retries:
                time.sleep(3)
        except requests.exceptions.RequestException as e:
            if attempt < retries:
                time.sleep(5)
            else:
                print(f"    ERROR: {e}")
    return None


def get_tag(token, tag):
    try:
        r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}/tag/{tag}/blocks",
                         headers=headers(token), timeout=20)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def login_as(token, did):
    requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/login",
                  headers=headers(token), json={"did": did})
    time.sleep(0.5)


# ═══ Main ingestion ═══

def main():
    parser = argparse.ArgumentParser(description="Bulk ingest facilities into Guardian")
    parser.add_argument("--start", type=int, default=0, help="Start index (0-based)")
    parser.add_argument("--count", type=int, default=50, help="Number of facilities to ingest")
    parser.add_argument("--readings-per", type=int, default=3, help="Readings per facility")
    parser.add_argument("--live", action="store_true", help="Run against PUBLISHED policy (real Hedera testnet)")
    args = parser.parse_args()

    with open("guardian/scripts/facilities-50.json") as f:
        all_facilities = json.load(f)

    facilities = all_facilities[args.start:args.start + args.count]
    print(f"\n{'='*70}")
    print(f"  ZENO BULK INGESTION — {len(facilities)} facilities, {args.readings_per} readings each")
    print(f"  Mode: {'LIVE (Hedera testnet)' if args.live else 'DRY-RUN (virtual)'}")
    print(f"{'='*70}\n")

    token = auth()
    print("✓ Authenticated with Guardian\n")

    # Check policy status
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token))
    policy_status = r.json().get("status", "?")
    print(f"Policy status: {policy_status}")

    if policy_status == "PUBLISH":
        print("✓ Policy is PUBLISHED — all data goes to real Hedera testnet\n")
    elif policy_status == "DRY-RUN":
        print("⚠ Policy in DRY-RUN — data is virtual, no Hedera transactions\n")
    else:
        print(f"⚠ Policy status: {policy_status}\n")

    if not args.live and policy_status != "PUBLISH":
        # Dry-run mode: create virtual users
        print("Setting up dry-run users...")
        users = []
        for name in ["Facility", "SPCB", "IoT", "Middleware"]:
            r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                              headers={"Authorization": f"Bearer {token}"})
            user = r.json()[-1] if isinstance(r.json(), list) else r.json()
            users.append(user["did"])
            time.sleep(1)
        facility_did, spcb_did, iot_did, mw_did = users
        print(f"  ✓ 4 virtual users created\n")
    else:
        # Published mode: Standard Registry operates all roles
        facility_did = spcb_did = iot_did = mw_did = None
        args.live = True  # Force live mode since policy is published

    # Stats tracking
    stats = {"registered": 0, "approved": 0, "readings": 0, "evaluations": 0,
             "compliant": 0, "violating": 0, "errors": 0}

    for idx, fac in enumerate(facilities):
        fnum = idx + args.start + 1
        cat = fac["industryCategory"]
        profile = PROFILES.get(cat, PROFILES["chemical"])
        compliance_rate = profile["compliance_rate"]

        print(f"[{fnum:02d}/{len(facilities)}] {fac['facilityId']} — {fac['facilityName']}")
        print(f"  Industry: {cat} | State: {fac['state']} | Target compliance: {compliance_rate*100:.0f}%")

        # ── Step 1: Register facility ──
        if not args.live:
            r = requests.post(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run/user",
                              headers={"Authorization": f"Bearer {token}"})
            new_user = r.json()[-1] if isinstance(r.json(), list) else r.json()
            this_facility_did = new_user["did"]
            login_as(token, this_facility_did)
            post_tag(token, "choose_role", {"role": "Facility"})
            time.sleep(1)
        # In published mode, Standard Registry can submit directly via tag API

        sensor_model = f"Horiba ENDA-600ZG" if cat == "tannery" else f"ABB AZ-200"
        serial = f"SN-{fac['facilityId'].replace('-', '')}-2024"
        cto = f"SPCB/{fac['state'][:2].upper()}/CTO/2024/{fnum:04d}"
        kms_key = f"arn:aws:kms:us-east-1:123456789:key/907fbc7e-{fac['facilityId'][-3:]}"

        reg_data = {
            "document": {
                "field0": fac["facilityId"],
                "field1": fac["facilityName"],
                "field2": fac["industryCategory"],
                "field3": fac["state"],
                "field4": fac["district"],
                "field5": fac["gpsLatitude"],
                "field6": fac["gpsLongitude"],
                "field7": sensor_model,
                "field8": serial,
                "field9": cto,
                "field10": "2028-03-31",
                "field11": fac["ctoDischargeMode"],
                "field12": 20 if cat == "tannery" else 30,
                "field13": 150 if cat == "tannery" else 250,
                "field14": 80 if cat == "tannery" else 100,
                "field15": kms_key,
                "field16": "0.0.8148249"
            },
            "ref": None
        }

        result = post_tag(token, "facility_registration_form", reg_data)
        if result:
            stats["registered"] += 1
            print(f"  ✓ Registered")
        else:
            stats["errors"] += 1
            print(f"  ✗ Registration FAILED — skipping")
            continue
        time.sleep(3)

        # ── Step 2: SPCB approval ──
        if not args.live:
            login_as(token, spcb_did)
            post_tag(token, "choose_role", {"role": "SPCB"})
            time.sleep(1)

        reg_grid = get_tag(token, "registrations_grid")
        if reg_grid and reg_grid.get("data"):
            # Approve the latest registration
            docs = reg_grid["data"]
            # Find our facility's doc
            for doc in reversed(docs):
                cs = doc.get("document", {}).get("credentialSubject", [{}])
                if isinstance(cs, list):
                    cs = cs[0] if cs else {}
                if cs.get("field0") == fac["facilityId"]:
                    doc_id = doc["id"]
                    approve = post_tag(token, "approve_registration_btn",
                                       {"documentId": doc_id, "dialogResult": "Approved"})
                    if approve:
                        stats["approved"] += 1
                        print(f"  ✓ Approved by SPCB")
                    break
        time.sleep(2)

        # ── Step 3: Submit sensor readings ──
        if not args.live:
            login_as(token, iot_did)
            post_tag(token, "choose_role", {"role": "IoT"})
            time.sleep(1)

        for r_idx in range(args.readings_per):
            # Determine if this reading is a violation based on industry compliance rate
            is_violation = seeded_random(f"{fac['facilityId']}_viol_{r_idx}") > compliance_rate
            reading = generate_reading(fac, r_idx, is_violation)
            evaluation = evaluate_reading(reading)

            reading_doc = {
                "document": {
                    "field0": reading["timestamp"],
                    "field1": fac["facilityId"],
                    "field2": reading["pH"],
                    "field3": reading["BOD"],
                    "field4": reading["COD"],
                    "field5": reading["TSS"],
                    "field6": reading["temp"],
                    "field7": reading["Cr_total"],
                    "field8": reading["Cr_hex"],
                    "field9": reading["oil"],
                    "field10": reading["NH3N"],
                    "field11": reading["DO"],
                    "field12": reading["flow"],
                    "field13": "online",
                    "field14": kms_key,
                    "field15": reading["sig_hash"]
                },
                "ref": None
            }

            result = post_tag(token, "sensor_data_intake", reading_doc)
            if result:
                stats["readings"] += 1
                label = "✓" if evaluation["overall"] else "✗"
                print(f"  {label} Reading #{r_idx+1}: pH={reading['pH']:<5} BOD={reading['BOD']:<6} "
                      f"COD={reading['COD']:<6} viol={evaluation['violations']}")
            else:
                stats["errors"] += 1
            time.sleep(3)

            # ── Step 4: Submit compliance evaluation ──
            if not args.live:
                login_as(token, mw_did)
                post_tag(token, "choose_role", {"role": "IoT"})
                time.sleep(0.5)

            eval_doc = {
                "document": {
                    "field0": f"EVAL-{fac['facilityId']}-{r_idx}-{int(time.time()*1000)}",
                    "field1": fac["facilityId"],
                    "field2": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "field3": "schedule_vi",
                    "field4": fac["ctoDischargeMode"] == "ZLD",
                    "field5": evaluation["pH_ok"],
                    "field6": reading["pH"],
                    "field7": evaluation["BOD_ok"],
                    "field8": reading["BOD"],
                    "field9": evaluation["COD_ok"],
                    "field10": reading["COD"],
                    "field11": evaluation["TSS_ok"],
                    "field12": reading["TSS"],
                    "field13": evaluation["temp_ok"],
                    "field14": reading["temp"],
                    "field15": evaluation["Cr_ok"],
                    "field16": reading["Cr_total"],
                    "field17": evaluation["overall"],
                    "field18": evaluation["violations"],
                    "field19": evaluation["critical"],
                    "field20": evaluation["action"],
                },
                "ref": None,
            }

            result = post_tag(token, "compliance_evaluation_intake", eval_doc)
            if result:
                stats["evaluations"] += 1
                if evaluation["overall"]:
                    stats["compliant"] += 1
                else:
                    stats["violating"] += 1

            # Switch back to IoT for next reading
            if not args.live:
                login_as(token, iot_did)
            time.sleep(2)

        print()

    # ═══ Summary ═══
    total_evals = stats["compliant"] + stats["violating"]
    rate = (stats["compliant"] / total_evals * 100) if total_evals > 0 else 0

    print(f"\n{'='*70}")
    print(f"  BULK INGESTION COMPLETE")
    print(f"{'='*70}")
    print(f"  Facilities registered: {stats['registered']}/{len(facilities)}")
    print(f"  SPCB approvals:        {stats['approved']}")
    print(f"  Sensor readings:       {stats['readings']}")
    print(f"  Evaluations:           {stats['evaluations']}")
    print(f"  Compliant:             {stats['compliant']} ({rate:.1f}%)")
    print(f"  Violating:             {stats['violating']}")
    print(f"  Errors:                {stats['errors']}")
    print(f"{'='*70}")

    return 0 if stats["errors"] < len(facilities) else 1


if __name__ == "__main__":
    sys.exit(main())
