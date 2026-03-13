#!/usr/bin/env python3
"""
Update the Zeno dMRV policy block tree on the self-hosted Guardian.
Reads existing schema IRIs from selfhosted-config.json.
"""
import json
import sys
import os
import requests
import uuid
import time

GUARDIAN_URL = "http://165.22.212.120:3000/api/v1"
POLICY_ID = "69b2891d42d30f9a24fc9a18"
USERNAME = "akash"
PASSWORD = "Akash@17327"

# Token IDs (already created on Hedera testnet)
GGCC_TOKEN_ID = "0.0.8182260"
ZVIOL_TOKEN_ID = "0.0.8182266"

# Schema IRIs (already published)
FR = "#4446ea1a-7631-48fe-9205-47991c4d6cdf&1.0.0"
SR = "#71192499-361c-4f86-a745-728bbdaae846&1.0.0"
CE = "#cc56ae96-e6ac-4b0e-9b9e-ebe835c10393&1.0.0"
SV = "#939b3017-c83b-4d0d-94f3-c32bd32c8653&1.0.0"

# Compliance JavaScript (runs in customLogicBlock)
COMPLIANCE_JS = r"""
(function() {
  var cs = Array.isArray(doc.document.credentialSubject)
    ? doc.document.credentialSubject[0]
    : doc.document.credentialSubject;

  if (!cs) { done(null); return; }

  var violationCount = 0;
  var criticalCount = 0;
  var pH_compliant = true, pH_value = cs.field2 || 0;
  var BOD_compliant = true, BOD_value = cs.field3 || 0;
  var COD_compliant = true, COD_value = cs.field4 || 0;
  var TSS_compliant = true, TSS_value = cs.field5 || 0;
  var temp_compliant = true, temp_value = cs.field6 || 0;
  var chromium_compliant = true, chromium_value = cs.field7 || 0;

  if (pH_value < 5.5 || pH_value > 9.0) { pH_compliant = false; violationCount++; }
  if (BOD_value > 30) { BOD_compliant = false; violationCount++; if (BOD_value > 45) criticalCount++; }
  if (COD_value > 250) { COD_compliant = false; violationCount++; if (COD_value > 375) criticalCount++; }
  if (TSS_value > 100) { TSS_compliant = false; violationCount++; if (TSS_value > 150) criticalCount++; }
  if (temp_value > 40) { temp_compliant = false; violationCount++; }
  if (chromium_value > 2.0) { chromium_compliant = false; violationCount++; if (chromium_value > 3.0) criticalCount++; }

  var overallCompliant = violationCount === 0;
  var tokenAction = 'none';
  if (overallCompliant) {
    tokenAction = 'mint_ggcc';
  } else if (criticalCount > 0) {
    tokenAction = 'mint_violation_nft';
  } else {
    tokenAction = 'pending_review';
  }

  var evaluation = {
    field0: 'EVAL-' + Date.now(),
    field1: cs.field1 || '',
    field2: new Date().toISOString(),
    field3: 'schedule_vi',
    field4: false,
    field5: pH_compliant,
    field6: pH_value,
    field7: BOD_compliant,
    field8: BOD_value,
    field9: COD_compliant,
    field10: COD_value,
    field11: TSS_compliant,
    field12: TSS_value,
    field13: temp_compliant,
    field14: temp_value,
    field15: chromium_compliant,
    field16: chromium_value,
    field17: overallCompliant,
    field18: violationCount,
    field19: criticalCount,
    field20: tokenAction
  };

  done(evaluation);
})();
"""


def uid():
    return str(uuid.uuid4())


def block(blockType, tag="", permissions=None, children=None, events=None, **kwargs):
    b = {
        "id": uid(),
        "blockType": blockType,
        "defaultActive": kwargs.pop("defaultActive", True if blockType.startswith("interface") or blockType in ["policyRolesBlock", "informationBlock", "reportBlock", "reportItemBlock"] else False),
        "permissions": permissions or ["ANY_ROLE"],
        "onErrorAction": "no-action",
        "uiMetaData": kwargs.pop("uiMetaData", {}),
        "tag": tag,
        "children": children or [],
        "events": events or [],
        "artifacts": [],
    }
    b.update(kwargs)
    return b


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def build_policy_config():
    # ── FACILITY WORKFLOW ──
    facility_steps = block("interfaceStepBlock", "facility_steps",
        permissions=["Facility"],
        uiMetaData={"type": "blank"},
        children=[
            block("requestVcDocumentBlock", "facility_registration_form",
                permissions=["Facility"],
                schema=FR,
                idType="DID",
                uiMetaData={"type": "page", "title": "Register Facility",
                            "description": "Submit your facility details for SPCB approval"},
            ),
            block("sendToGuardianBlock", "save_registration",
                permissions=["Facility"],
                dataType="vc-documents",
                stopPropagation=False,
            ),
            block("informationBlock", "wait_for_approval",
                permissions=["Facility"],
                uiMetaData={"type": "text", "description": "Your facility registration has been submitted. Please wait for SPCB approval.",
                            "title": "Registration Submitted"},
            ),
        ],
    )

    facility_workflow = block("interfaceContainerBlock", "facility_workflow",
        permissions=["Facility"],
        uiMetaData={"type": "tabs"},
        children=[
            block("interfaceContainerBlock", "facility_reg_tab",
                permissions=["Facility"],
                uiMetaData={"type": "blank", "title": "Registration"},
                children=[facility_steps],
            ),
            block("interfaceContainerBlock", "facility_compliance_tab",
                permissions=["Facility"],
                uiMetaData={"type": "blank", "title": "Sensor Readings"},
                children=[
                    block("interfaceDocumentsSourceBlock", "my_compliance_grid",
                        permissions=["Facility"],
                        uiMetaData={"fields": [
                            {"title": "Timestamp", "name": "document.credentialSubject.0.field0", "type": "text"},
                            {"title": "pH", "name": "document.credentialSubject.0.field2", "type": "text"},
                            {"title": "BOD", "name": "document.credentialSubject.0.field3", "type": "text"},
                            {"title": "COD", "name": "document.credentialSubject.0.field4", "type": "text"},
                            {"title": "TSS", "name": "document.credentialSubject.0.field5", "type": "text"},
                            {"title": "Status", "name": "document.credentialSubject.0.field13", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "my_compliance_source",
                                permissions=["Facility"],
                                schema=SR,
                                dataType="vc-documents",
                                filters=[],
                                onlyOwnDocuments=True,
                            ),
                        ],
                    ),
                ],
            ),
            block("interfaceContainerBlock", "facility_tokens_tab",
                permissions=["Facility"],
                uiMetaData={"type": "blank", "title": "Tokens"},
                children=[
                    block("interfaceDocumentsSourceBlock", "my_tokens_grid",
                        permissions=["Facility"],
                        uiMetaData={},
                        children=[
                            block("documentsSourceAddon", "tokens_source",
                                permissions=["Facility"],
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ── IoT WORKFLOW ──
    # 1. sensor_data_intake: IoT user submits SensorReading VCs (cyclic)
    # 2. compliance_evaluation_intake: Middleware submits CE VCs → switchBlock → mintDocumentBlock
    iot_workflow = block("interfaceContainerBlock", "iot_workflow",
        permissions=["IoT"],
        uiMetaData={"type": "blank"},
        children=[
            block("interfaceStepBlock", "iot_steps",
                permissions=["IoT"],
                uiMetaData={"type": "blank"},
                cyclic=True,
                children=[
                    block("requestVcDocumentBlock", "sensor_data_intake",
                        permissions=["IoT"],
                        schema=SR,
                        idType="DID",
                        uiMetaData={"type": "page", "title": "Submit Sensor Reading",
                                    "description": "Submit OCEMS sensor data"},
                    ),
                    block("sendToGuardianBlock", "save_sensor_reading",
                        permissions=["IoT"],
                        dataType="vc-documents",
                        stopPropagation=False,
                    ),
                ],
            ),
            block("interfaceStepBlock", "ce_intake_steps",
                permissions=["IoT"],
                uiMetaData={"type": "blank"},
                cyclic=True,
                children=[
                    block("requestVcDocumentBlock", "compliance_evaluation_intake",
                        permissions=["IoT"],
                        schema=CE,
                        idType="DID",
                        uiMetaData={"type": "page", "title": "Compliance Evaluation",
                                    "description": "Submit compliance evaluation result"},
                    ),
                    block("sendToGuardianBlock", "save_evaluation",
                        permissions=["IoT"],
                        dataType="vc-documents",
                        stopPropagation=False,
                    ),
                    # Route by compliance result → mint tokens (events connect to mint blocks below)
                    block("switchBlock", "compliance_router",
                        permissions=["IoT"],
                        executionFlow="firstTrue",
                        conditions=[
                            {"tag": "mint_ggcc_path", "type": "equal",
                             "value": "field20 == 'mint_ggcc'"},
                            {"tag": "mint_violation_path", "type": "equal",
                             "value": "field20 == 'mint_violation_nft'"},
                        ],
                        events=[
                            {"source": "compliance_router", "target": "mint_ggcc_block",
                             "input": "RunEvent", "output": "mint_ggcc_path",
                             "actor": "", "disabled": False},
                            {"source": "compliance_router", "target": "mint_violation_block",
                             "input": "RunEvent", "output": "mint_violation_path",
                             "actor": "", "disabled": False},
                        ],
                    ),
                ],
            ),
            # Mint blocks — triggered by switchBlock events (not children)
            block("mintDocumentBlock", "mint_ggcc_block",
                permissions=["IoT"],
                tokenId=GGCC_TOKEN_ID,
                rule="1",
                accountType="default",
            ),
            block("mintDocumentBlock", "mint_violation_block",
                permissions=["IoT"],
                tokenId=ZVIOL_TOKEN_ID,
                rule="1",
                accountType="default",
            ),
        ],
    )

    # ── SPCB WORKFLOW ──
    spcb_workflow = block("interfaceContainerBlock", "spcb_workflow",
        permissions=["SPCB"],
        uiMetaData={"type": "tabs"},
        children=[
            block("interfaceContainerBlock", "pending_registrations_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Facility Registrations"},
                children=[
                    block("interfaceDocumentsSourceBlock", "registrations_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.field1", "type": "text"},
                            {"title": "Industry", "name": "document.credentialSubject.0.field2", "type": "text"},
                            {"title": "State", "name": "document.credentialSubject.0.field3", "type": "text"},
                            {"title": "CTO Number", "name": "document.credentialSubject.0.field9", "type": "text"},
                            {"title": "Status", "name": "option.status", "type": "text"},
                        ]},
                        events=[
                            {"target": "save_registration_status_approved", "source": "registrations_grid", "input": "RunEvent", "output": "approve_registration_btn", "actor": "owner", "disabled": False},
                            {"target": "save_registration_status_rejected", "source": "registrations_grid", "input": "RunEvent", "output": "reject_registration_btn", "actor": "owner", "disabled": False},
                        ],
                        children=[
                            block("documentsSourceAddon", "registrations_need_approve",
                                permissions=["SPCB"],
                                schema=FR,
                                dataType="vc-documents",
                                filters=[],
                            ),
                            block("buttonBlockAddon", "approve_registration_btn",
                                permissions=["SPCB"],
                                defaultActive=False,
                                name="Approve",
                                uiClass="btn-approve",
                                dialog=True,
                                dialogOptions={
                                    "dialogTitle": "Approve Registration",
                                    "dialogDescription": "Confirm approval",
                                    "dialogResultFieldPath": "option.status",
                                },
                            ),
                            block("buttonBlockAddon", "reject_registration_btn",
                                permissions=["SPCB"],
                                defaultActive=False,
                                name="Reject",
                                uiClass="btn-reject",
                                dialog=True,
                                dialogOptions={
                                    "dialogTitle": "Reject Registration",
                                    "dialogDescription": "Enter rejection reason",
                                    "dialogResultFieldPath": "option.status",
                                },
                            ),
                        ],
                    ),
                    block("sendToGuardianBlock", "save_registration_status_approved",
                        permissions=["SPCB"],
                        dataType="vc-documents",
                        stopPropagation=False,
                    ),
                    block("sendToGuardianBlock", "save_registration_status_rejected",
                        permissions=["SPCB"],
                        dataType="vc-documents",
                        stopPropagation=True,
                    ),
                ],
            ),
            # Compliance Evaluations tab
            block("interfaceContainerBlock", "evaluations_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Compliance Evaluations"},
                children=[
                    block("interfaceDocumentsSourceBlock", "evaluations_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.field1", "type": "text"},
                            {"title": "pH OK", "name": "document.credentialSubject.0.field5", "type": "text"},
                            {"title": "pH", "name": "document.credentialSubject.0.field6", "type": "text"},
                            {"title": "BOD OK", "name": "document.credentialSubject.0.field7", "type": "text"},
                            {"title": "COD OK", "name": "document.credentialSubject.0.field9", "type": "text"},
                            {"title": "TSS OK", "name": "document.credentialSubject.0.field11", "type": "text"},
                            {"title": "Cr OK", "name": "document.credentialSubject.0.field15", "type": "text"},
                            {"title": "Overall", "name": "document.credentialSubject.0.field17", "type": "text"},
                            {"title": "Violations", "name": "document.credentialSubject.0.field18", "type": "text"},
                            {"title": "Action", "name": "document.credentialSubject.0.field20", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.field2", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "evaluations_source",
                                permissions=["SPCB"],
                                schema=CE,
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
            # Sensor Readings Monitor tab
            block("interfaceContainerBlock", "compliance_monitor_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Sensor Readings Monitor"},
                children=[
                    block("interfaceDocumentsSourceBlock", "monitor_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.field1", "type": "text"},
                            {"title": "Timestamp", "name": "document.credentialSubject.0.field0", "type": "text"},
                            {"title": "pH", "name": "document.credentialSubject.0.field2", "type": "text"},
                            {"title": "BOD", "name": "document.credentialSubject.0.field3", "type": "text"},
                            {"title": "COD", "name": "document.credentialSubject.0.field4", "type": "text"},
                            {"title": "TSS", "name": "document.credentialSubject.0.field5", "type": "text"},
                            {"title": "Temp", "name": "document.credentialSubject.0.field6", "type": "text"},
                            {"title": "Chromium", "name": "document.credentialSubject.0.field7", "type": "text"},
                            {"title": "Status", "name": "document.credentialSubject.0.field13", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "monitor_source",
                                permissions=["SPCB"],
                                schema=SR,
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ── VVB WORKFLOW ──
    vvb_workflow = block("interfaceContainerBlock", "vvb_workflow",
        permissions=["VVB"],
        uiMetaData={"type": "tabs"},
        children=[
            block("interfaceContainerBlock", "flagged_violations_page",
                permissions=["VVB"],
                uiMetaData={"type": "blank", "title": "Pending Review"},
                children=[
                    block("interfaceDocumentsSourceBlock", "flagged_grid",
                        permissions=["VVB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.field1", "type": "text"},
                            {"title": "Violations", "name": "document.credentialSubject.0.field18", "type": "text"},
                            {"title": "Action", "name": "document.credentialSubject.0.field20", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.field2", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "flagged_source",
                                permissions=["VVB"],
                                schema=CE,
                                dataType="vc-documents",
                                filters=[{"type": "equal", "field": "option.status", "value": "Pending Review"}],
                            ),
                        ],
                    ),
                ],
            ),
            block("interfaceContainerBlock", "satellite_data_page",
                permissions=["VVB"],
                uiMetaData={"type": "blank", "title": "Satellite Validation"},
                children=[
                    block("interfaceDocumentsSourceBlock", "satellite_grid",
                        permissions=["VVB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.field0", "type": "text"},
                            {"title": "NDTI", "name": "document.credentialSubject.0.field2", "type": "text"},
                            {"title": "Turbidity", "name": "document.credentialSubject.0.field4", "type": "text"},
                            {"title": "Correlation", "name": "document.credentialSubject.0.field6", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.field1", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "satellite_source",
                                permissions=["VVB"],
                                schema=SV,
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ── TRUST CHAIN ──
    trust_chain = block("interfaceContainerBlock", "trust_chain",
        permissions=["OWNER"],
        uiMetaData={"type": "blank", "title": "Trust Chain"},
        children=[
            block("reportBlock", "trustChainBlock",
                permissions=["OWNER"],
                children=[
                    block("reportItemBlock", "MintTokenItem",
                        permissions=["OWNER"],
                        filters=[], dynamicFilters=[],
                        visible=True, iconType="COMMON", icon="token",
                        title="Token Mint",
                        description="GGCC Compliance Credit or ZVIOL Violation Record",
                        multiple=False,
                        variables=[
                            {"name": "tokenId", "value": "tokenId"},
                            {"name": "facilityId", "value": "document.credentialSubject.0.field1"},
                        ],
                    ),
                    block("reportItemBlock", "evaluation_report",
                        permissions=["OWNER"],
                        filters=[{"field": "type", "type": "equal", "typeValue": "value", "value": CE}],
                        dynamicFilters=[],
                        visible=True, iconType="COMMON", icon="report",
                        title="Compliance Evaluation",
                        description="CPCB Schedule-VI threshold verification",
                        multiple=False,
                        variables=[
                            {"name": "facilityId", "value": "document.credentialSubject.0.field1"},
                            {"name": "overallCompliant", "value": "document.credentialSubject.0.field17"},
                            {"name": "violationCount", "value": "document.credentialSubject.0.field18"},
                            {"name": "tokenAction", "value": "document.credentialSubject.0.field20"},
                        ],
                    ),
                    block("reportItemBlock", "reading_report",
                        permissions=["OWNER"],
                        filters=[{"field": "type", "type": "equal", "typeValue": "value", "value": SR}],
                        dynamicFilters=[],
                        visible=True, iconType="COMMON", icon="report",
                        title="Sensor Reading",
                        description="KMS-signed OCEMS sensor data",
                        multiple=True,
                        variables=[
                            {"name": "timestamp", "value": "document.credentialSubject.0.field0"},
                            {"name": "facilityId", "value": "document.credentialSubject.0.field1"},
                            {"name": "pH", "value": "document.credentialSubject.0.field2"},
                            {"name": "kmsSigHash", "value": "document.credentialSubject.0.field15"},
                        ],
                    ),
                    block("reportItemBlock", "facility_report",
                        permissions=["OWNER"],
                        filters=[{"field": "type", "type": "equal", "typeValue": "value", "value": FR}],
                        dynamicFilters=[],
                        visible=True, iconType="COMMON", icon="report",
                        title="Facility Registration",
                        description="SPCB-approved industrial facility",
                        multiple=False,
                        variables=[
                            {"name": "facilityName", "value": "document.credentialSubject.0.field1"},
                            {"name": "ctoNumber", "value": "document.credentialSubject.0.field9"},
                            {"name": "state", "value": "document.credentialSubject.0.field3"},
                        ],
                    ),
                ],
            ),
        ],
    )

    # ── ROOT ──
    root = block("interfaceContainerBlock", "",
        permissions=["ANY_ROLE"],
        uiMetaData={"type": "blank"},
        children=[
            block("policyRolesBlock", "choose_role",
                permissions=["NO_ROLE"],
                uiMetaData={"title": "Registration", "description": "Choose your role in the Zeno dMRV system"},
                roles=["Facility", "SPCB", "VVB", "IoT"],
            ),
            facility_workflow,
            iot_workflow,
            spcb_workflow,
            vvb_workflow,
            trust_chain,
        ],
    )

    return root


def main():
    # Auth
    print("Authenticating...")
    r = requests.post(f"{GUARDIAN_URL}/accounts/login", json={"username": USERNAME, "password": PASSWORD})
    refresh = r.json()["refreshToken"]
    r = requests.post(f"{GUARDIAN_URL}/accounts/access-token", json={"refreshToken": refresh})
    token = r.json()["accessToken"]
    print("  OK")

    # Build config
    config = build_policy_config()
    def count(b):
        return 1 + sum(count(c) for c in b.get("children", []))
    print(f"Total blocks: {count(config)}")

    # GET current policy
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token))
    if r.status_code != 200:
        print(f"GET failed: {r.status_code}")
        sys.exit(1)
    current = r.json()
    print(f"Current status: {current.get('status')}")

    # Update
    current["config"] = config
    current["policyRoles"] = ["Facility", "SPCB", "VVB", "IoT"]
    current["policyTopics"] = [{
        "name": "Project",
        "description": "Facility registration and compliance data",
        "type": "any",
        "static": False,
        "memoObj": "topic",
    }]
    current["policyTokens"] = [
        {
            "templateTokenTag": "GGCC_token",
            "tokenName": "Green Ganga Compliance Credit",
            "tokenSymbol": "GGCC",
            "tokenType": "fungible",
            "decimals": "0",
            "initialSupply": "0",
            "tokenId": GGCC_TOKEN_ID,
        },
        {
            "templateTokenTag": "ZVIOL_token",
            "tokenName": "Zeno Violation Record",
            "tokenSymbol": "ZVIOL",
            "tokenType": "non-fungible",
            "tokenId": ZVIOL_TOKEN_ID,
        },
    ]
    current["policyGroups"] = []

    for key in ["_id", "id", "createDate", "updateDate", "hashMap", "hashMapFileId",
                "configFileId", "hash", "userRole", "userRoles", "userGroup", "userGroups",
                "tests", "importantParameters"]:
        current.pop(key, None)

    print("Updating policy blocks...")
    r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token), json=current)
    if r.status_code in [200, 201]:
        print("  Policy updated successfully!")
    else:
        print(f"  PUT failed: {r.status_code} {r.text[:1000]}")
        sys.exit(1)

    # Start dry-run
    if "--dry-run" in sys.argv:
        print("Starting dry-run...")
        time.sleep(2)
        r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run",
                         headers={"Authorization": f"Bearer {token}"})
        if r.status_code in [200, 201]:
            print("  Dry-run started!")
        else:
            print(f"  Dry-run failed: {r.status_code} {r.text[:500]}")


if __name__ == "__main__":
    main()
