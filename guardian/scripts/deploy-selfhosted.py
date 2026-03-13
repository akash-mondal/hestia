#!/usr/bin/env python3
"""
Deploy Zeno dMRV policy to self-hosted Guardian instance.

Steps:
1. Authenticate
2. Create policy
3. Create 4 schemas on policy topic
4. Publish schemas
5. Update policy with block tree (using new schema IRIs)
6. Optionally start dry-run

Usage:
  python3 deploy-selfhosted.py                # Create policy + schemas + update blocks
  python3 deploy-selfhosted.py --dry-run      # Also start dry-run after deploy
"""

import json
import uuid
import requests
import sys
import time

# ── Self-hosted Guardian Config ──
GUARDIAN_URL = "http://165.22.212.120:3000/api/v1"
USERNAME = "akash"
PASSWORD = "Akash@17327"

# Token IDs (already created on Hedera testnet)
GGCC_TOKEN_ID = "0.0.8182260"
ZVIOL_TOKEN_ID = "0.0.8182266"
ZCERT_TOKEN_ID = ""  # Not created yet

# Will be populated after creation
POLICY_ID = None
POLICY_TOPIC_ID = None
SCHEMA_IRIS = {}


def uid():
    return str(uuid.uuid4())


def block(blockType, tag="", permissions=None, children=None, events=None, **kwargs):
    """Create a Guardian policy block."""
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


# ============================================================
# COMPLIANCE CHECK JAVASCRIPT (runs in customLogicBlock)
# ============================================================
# NOTE: This runs in customLogicBlock, triggered by events from save_sensor_reading
# (outside the interfaceStepBlock). Input: SensorReading VC. Output: ComplianceEvaluation VC.
COMPLIANCE_JS = r"""
(function() {
  var cs = Array.isArray(doc.document.credentialSubject)
    ? doc.document.credentialSubject[0]
    : doc.document.credentialSubject;

  if (!cs) { done(null); return; }

  // SensorReading schema field mapping:
  // field0=Timestamp, field1=FacilityID, field2=pH, field3=BOD, field4=COD,
  // field5=TSS, field6=Temperature, field7=TotalChromium, field8=HexChromium,
  // field9=OilAndGrease, field10=AmmoniacalN, field11=DissolvedOxygen,
  // field12=Flow, field13=SensorStatus, field14=KMSKeyID, field15=KMSSigHash

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

  // ComplianceEvaluation schema field mapping:
  // field0=EvalID, field1=FacilityID, field2=EvaluatedAt, field3=LimitsSource,
  // field4=ZLD, field5=pHCompliant, field6=pHValue, field7=BODCompliant,
  // field8=BODValue, field9=CODCompliant, field10=CODValue, field11=TSSCompliant,
  // field12=TSSValue, field13=TempCompliant, field14=TempValue, field15=CrCompliant,
  // field16=CrValue, field17=OverallCompliant, field18=ViolationCount,
  // field19=CriticalViolations, field20=TokenAction
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


# ============================================================
# SCHEMA DEFINITIONS (Guardian JSON Schema Draft 7 format)
# ============================================================

def make_guardian_schema(name, description, fields):
    """Convert our schema format to Guardian's JSON Schema Draft 7 format."""
    type_map = {
        "string": "string",
        "number": "number",
        "integer": "integer",
        "boolean": "boolean",
    }

    properties = {}
    required = []
    for i, f in enumerate(fields):
        field_key = f"field{i}"
        prop = {
            "$comment": json.dumps({
                "term": field_key,
                "@id": f"https://www.schema.org/text#{field_key}",
            }),
            "title": f["title"],
            "description": f["description"],
            "type": type_map.get(f["type"], "string"),
        }
        if f.get("isArray"):
            prop = {"type": "array", "items": prop}
        properties[field_key] = prop

        if f.get("required"):
            required.append(field_key)

    schema_uuid = str(uuid.uuid4())
    return {
        "name": name,
        "description": description,
        "entity": "VC",
        "status": "DRAFT",
        "document": {
            "$id": f"#{schema_uuid}",
            "$comment": json.dumps({
                "term": name,
                "@id": f"https://www.schema.org/text#{name}",
            }),
            "title": name,
            "description": description,
            "type": "object",
            "properties": {
                "@context": {"oneOf": [{"type": "string"}, {"type": "array"}]},
                "type": {"oneOf": [{"type": "string"}, {"type": "array"}]},
                "id": {"type": "string"},
                "policyId": {
                    "title": "Policy ID",
                    "description": "Guardian policy identifier",
                    "readOnly": True,
                    "type": "string",
                    "$comment": json.dumps({"term": "policyId", "@id": "https://www.schema.org/text"}),
                },
                "ref": {
                    "title": "Reference",
                    "description": "Document reference",
                    "readOnly": True,
                    "type": "string",
                    "$comment": json.dumps({"term": "ref", "@id": "https://www.schema.org/text"}),
                },
                **properties,
            },
            "required": ["@context", "type"] + required,
        },
        "fields": [
            {
                "name": f["name"],
                "title": f["title"],
                "description": f["description"],
                "type": type_map.get(f["type"], "string"),
                "required": f.get("required", False),
                "isArray": f.get("isArray", False),
                "order": i,
            }
            for i, f in enumerate(fields)
        ],
    }


SCHEMAS = {
    "FacilityRegistration": {
        "description": "Industrial facility registration with CPCB OCEMS device identity and Consent to Operate details",
        "fields": [
            {"name": "facilityId", "title": "Facility ID", "description": "Unique facility identifier", "type": "string", "required": True},
            {"name": "facilityName", "title": "Facility Name", "description": "Official registered name", "type": "string", "required": True},
            {"name": "industryCategory", "title": "Industry Category", "description": "CPCB industry category", "type": "string", "required": True},
            {"name": "state", "title": "State", "description": "Indian state", "type": "string", "required": True},
            {"name": "district", "title": "District", "description": "District within state", "type": "string", "required": True},
            {"name": "gpsLatitude", "title": "GPS Latitude", "description": "Facility GPS latitude", "type": "number", "required": True},
            {"name": "gpsLongitude", "title": "GPS Longitude", "description": "Facility GPS longitude", "type": "number", "required": True},
            {"name": "ocemsSensorModel", "title": "OCEMS Sensor Model", "description": "OCEMS analyzer model", "type": "string", "required": True},
            {"name": "analyzerSerialNumber", "title": "Analyzer Serial Number", "description": "Unique device serial number", "type": "string", "required": True},
            {"name": "ctoNumber", "title": "CTO Number", "description": "Consent to Operate permit number", "type": "string", "required": True},
            {"name": "ctoValidUntil", "title": "CTO Valid Until", "description": "CTO expiry date (ISO 8601)", "type": "string", "required": True},
            {"name": "ctoDischargeMode", "title": "Discharge Mode", "description": "discharge or ZLD", "type": "string", "required": True},
            {"name": "ctoBODLimit", "title": "CTO BOD Limit (mg/L)", "description": "Custom BOD limit", "type": "number", "required": False},
            {"name": "ctoCODLimit", "title": "CTO COD Limit (mg/L)", "description": "Custom COD limit", "type": "number", "required": False},
            {"name": "ctoTSSLimit", "title": "CTO TSS Limit (mg/L)", "description": "Custom TSS limit", "type": "number", "required": False},
            {"name": "deviceKmsKeyId", "title": "Device KMS Key ID", "description": "AWS KMS key ARN", "type": "string", "required": True},
            {"name": "deviceHederaAccountId", "title": "Device Hedera Account", "description": "Hedera account controlled by KMS key", "type": "string", "required": True},
        ],
    },
    "SensorReading": {
        "description": "OCEMS sensor reading with KMS-signed CPCB Schedule-VI parameters",
        "fields": [
            {"name": "timestamp", "title": "Timestamp", "description": "ISO 8601 timestamp", "type": "string", "required": True},
            {"name": "facilityId", "title": "Facility ID", "description": "Links to FacilityRegistration", "type": "string", "required": True},
            {"name": "pH", "title": "pH", "description": "pH value (5.5-9.0)", "type": "number", "required": True},
            {"name": "BOD_mgL", "title": "BOD (mg/L)", "description": "BOD (limit: 30)", "type": "number", "required": True},
            {"name": "COD_mgL", "title": "COD (mg/L)", "description": "COD (limit: 250)", "type": "number", "required": True},
            {"name": "TSS_mgL", "title": "TSS (mg/L)", "description": "TSS (limit: 100)", "type": "number", "required": True},
            {"name": "temperature_C", "title": "Temperature (C)", "description": "Effluent temperature", "type": "number", "required": True},
            {"name": "totalChromium_mgL", "title": "Total Chromium (mg/L)", "description": "Total chromium (limit: 2.0)", "type": "number", "required": True},
            {"name": "hexChromium_mgL", "title": "Hex Chromium (mg/L)", "description": "Hexavalent chromium", "type": "number", "required": False},
            {"name": "oilAndGrease_mgL", "title": "Oil and Grease (mg/L)", "description": "Oil and grease", "type": "number", "required": False},
            {"name": "ammoniacalN_mgL", "title": "Ammoniacal N (mg/L)", "description": "Ammoniacal nitrogen", "type": "number", "required": False},
            {"name": "dissolvedOxygen_mgL", "title": "Dissolved Oxygen (mg/L)", "description": "Dissolved oxygen", "type": "number", "required": False},
            {"name": "flow_KLD", "title": "Flow (KLD)", "description": "Effluent flow in KLD", "type": "number", "required": True},
            {"name": "sensorStatus", "title": "Sensor Status", "description": "online, offline_queued, etc.", "type": "string", "required": True},
            {"name": "kmsKeyId", "title": "KMS Key ID", "description": "AWS KMS key that signed this reading", "type": "string", "required": True},
            {"name": "kmsSigHash", "title": "KMS Signature Hash", "description": "64-byte ECDSA signature", "type": "string", "required": True},
        ],
    },
    "ComplianceEvaluation": {
        "description": "CPCB Schedule-VI compliance evaluation result",
        "fields": [
            {"name": "evaluationId", "title": "Evaluation ID", "description": "Unique evaluation identifier", "type": "string", "required": True},
            {"name": "facilityId", "title": "Facility ID", "description": "Facility evaluated", "type": "string", "required": True},
            {"name": "evaluatedAt", "title": "Evaluated At", "description": "ISO 8601 timestamp", "type": "string", "required": True},
            {"name": "limitsSource", "title": "Limits Source", "description": "schedule_vi or cto_override", "type": "string", "required": True},
            {"name": "isZLD", "title": "ZLD Mode", "description": "Zero Liquid Discharge mandate", "type": "boolean", "required": True},
            {"name": "pH_compliant", "title": "pH Compliant", "description": "pH within limits", "type": "boolean", "required": True},
            {"name": "pH_value", "title": "pH Value", "description": "Measured pH", "type": "number", "required": True},
            {"name": "BOD_compliant", "title": "BOD Compliant", "description": "BOD within limits", "type": "boolean", "required": True},
            {"name": "BOD_value", "title": "BOD Value (mg/L)", "description": "Measured BOD", "type": "number", "required": True},
            {"name": "COD_compliant", "title": "COD Compliant", "description": "COD within limits", "type": "boolean", "required": True},
            {"name": "COD_value", "title": "COD Value (mg/L)", "description": "Measured COD", "type": "number", "required": True},
            {"name": "TSS_compliant", "title": "TSS Compliant", "description": "TSS within limits", "type": "boolean", "required": True},
            {"name": "TSS_value", "title": "TSS Value (mg/L)", "description": "Measured TSS", "type": "number", "required": True},
            {"name": "temp_compliant", "title": "Temp Compliant", "description": "Temp within limits", "type": "boolean", "required": True},
            {"name": "temp_value", "title": "Temp Value (C)", "description": "Measured temperature", "type": "number", "required": True},
            {"name": "chromium_compliant", "title": "Chromium Compliant", "description": "Chromium within limits", "type": "boolean", "required": True},
            {"name": "chromium_value", "title": "Chromium Value (mg/L)", "description": "Measured chromium", "type": "number", "required": True},
            {"name": "overallCompliant", "title": "Overall Compliant", "description": "All parameters pass", "type": "boolean", "required": True},
            {"name": "violationCount", "title": "Violation Count", "description": "Parameters exceeding limits", "type": "integer", "required": True},
            {"name": "criticalViolationCount", "title": "Critical Violations", "description": "Critical threshold exceeded", "type": "integer", "required": True},
            {"name": "tokenAction", "title": "Token Action", "description": "mint_ggcc, mint_violation_nft, pending_review", "type": "string", "required": True},
        ],
    },
    "SatelliteValidation": {
        "description": "Sentinel-2 satellite cross-validation using Se2WaQ indices",
        "fields": [
            {"name": "facilityId", "title": "Facility ID", "description": "Facility being cross-validated", "type": "string", "required": True},
            {"name": "sentinelTileDate", "title": "Sentinel Tile Date", "description": "Date of satellite pass", "type": "string", "required": True},
            {"name": "NDTI_value", "title": "NDTI Value", "description": "Normalized Difference Turbidity Index", "type": "number", "required": True},
            {"name": "NDCI_value", "title": "NDCI Value", "description": "Normalized Difference Chlorophyll Index", "type": "number", "required": True},
            {"name": "turbidity_NTU", "title": "Turbidity (NTU)", "description": "Se2WaQ turbidity", "type": "number", "required": True},
            {"name": "chlorophyll_mgm3", "title": "Chlorophyll-a (mg/m3)", "description": "Se2WaQ chlorophyll", "type": "number", "required": True},
            {"name": "correlationScore", "title": "Correlation Score", "description": "OCEMS vs satellite agreement (0-1)", "type": "number", "required": True},
        ],
    },
}


# ============================================================
# API FUNCTIONS
# ============================================================

def authenticate():
    """Login and get access token."""
    print("Authenticating...")
    r = requests.post(f"{GUARDIAN_URL}/accounts/login", json={
        "username": USERNAME,
        "password": PASSWORD,
    })
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text[:500]}")
        sys.exit(1)
    refresh_token = r.json()["refreshToken"]

    r = requests.post(f"{GUARDIAN_URL}/accounts/access-token", json={
        "refreshToken": refresh_token,
    })
    if r.status_code not in [200, 201]:
        print(f"Access token failed: {r.status_code} {r.text[:500]}")
        sys.exit(1)
    token = r.json()["accessToken"]
    print("  Authenticated.")
    return token


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_policy(token):
    """Create a new policy (or find existing) and return its ID + topic."""
    global POLICY_ID, POLICY_TOPIC_ID
    print("Creating policy...")

    payload = {
        "name": "Zeno Industrial Effluent dMRV",
        "description": "Digital MRV for CPCB Schedule-VI industrial effluent compliance verification on Hedera",
        "topicDescription": "Zeno dMRV Policy Topic",
        "policyTag": "zeno_dmrv_v1",
    }
    r = requests.post(f"{GUARDIAN_URL}/policies/", headers=headers(token), json=payload)

    if r.status_code in [200, 201]:
        result = r.json()
        if isinstance(result, list):
            policy = None
            for p in result:
                if p.get("name") == "Zeno Industrial Effluent dMRV":
                    policy = p
                    break
            if not policy:
                policy = result[-1]
        else:
            policy = result
    elif r.status_code == 500 and "duplicate key" in r.text:
        # Policy already exists, find it
        print("  Policy already exists, fetching...")
        r = requests.get(f"{GUARDIAN_URL}/policies/", headers=headers(token))
        policies = r.json()
        policy = None
        for p in policies:
            if p.get("policyTag") == "zeno_dmrv_v1":
                policy = p
                break
        if not policy:
            print("  Could not find existing policy!")
            sys.exit(1)
    else:
        print(f"Create policy failed: {r.status_code} {r.text[:500]}")
        sys.exit(1)

    POLICY_ID = policy.get("id") or policy.get("_id")
    POLICY_TOPIC_ID = policy.get("topicId")

    # If topicId not in response, fetch the policy
    if not POLICY_TOPIC_ID:
        print("  Waiting for policy topic creation...")
        time.sleep(10)
        r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token))
        policy = r.json()
        POLICY_TOPIC_ID = policy.get("topicId")

    print(f"  Policy ID: {POLICY_ID}")
    print(f"  Policy Topic: {POLICY_TOPIC_ID}")
    return POLICY_ID


def create_schema(token, name, description, fields):
    """Create a schema on the policy topic."""
    print(f"  Creating schema: {name}...")

    schema_data = make_guardian_schema(name, description, fields)
    schema_data["topicId"] = POLICY_TOPIC_ID

    r = requests.post(
        f"{GUARDIAN_URL}/schemas/{POLICY_TOPIC_ID}",
        headers=headers(token),
        json=schema_data,
    )
    if r.status_code not in [200, 201]:
        print(f"    Create failed: {r.status_code} {r.text[:500]}")
        return None

    result = r.json()
    # API may return a list of all schemas
    if isinstance(result, list):
        # Find our DRAFT schema by name (not already-published ones)
        schema = None
        for s in result:
            if s.get("name") == name and s.get("status") == "DRAFT":
                schema = s
                break
        if not schema:
            # Fallback: find newest by name
            for s in reversed(result):
                if s.get("name") == name:
                    schema = s
                    break
        if not schema:
            schema = result[-1]
    else:
        schema = result

    schema_id = schema.get("id") or schema.get("_id")
    iri = schema.get("iri")
    print(f"    Created: id={schema_id}, iri={iri}")
    return {"id": schema_id, "iri": iri}


def publish_schema(token, schema_id):
    """Publish a draft schema."""
    print(f"    Publishing schema {schema_id}...")
    r = requests.put(
        f"{GUARDIAN_URL}/schemas/{schema_id}/publish",
        headers=headers(token),
        json={"version": "1.0.0"},
    )
    if r.status_code not in [200, 201]:
        print(f"    Publish failed: {r.status_code} {r.text[:500]}")
        return None
    result = r.json()
    if isinstance(result, list):
        # Find by id
        schema = None
        for s in result:
            if (s.get("id") or s.get("_id")) == schema_id:
                schema = s
                break
        if not schema:
            schema = result[-1]
    else:
        schema = result
    new_iri = schema.get("iri")
    print(f"    Published: iri={new_iri}")
    return new_iri


def create_and_publish_schemas(token):
    """Create and publish all 4 schemas."""
    global SCHEMA_IRIS
    print("Creating schemas...")

    for name, data in SCHEMAS.items():
        result = create_schema(token, name, data["description"], data["fields"])
        if result:
            published_iri = publish_schema(token, result["id"])
            SCHEMA_IRIS[name] = published_iri or result["iri"]
            time.sleep(2)  # Give Guardian time to process

    print(f"\nSchema IRIs:")
    for name, iri in SCHEMA_IRIS.items():
        print(f"  {name}: {iri}")
    return SCHEMA_IRIS


# ============================================================
# POLICY BLOCK TREE (same as build-policy.py but with dynamic IRIs)
# ============================================================

def build_policy_config():
    """Build the complete Zeno policy block tree."""
    FR = SCHEMA_IRIS.get("FacilityRegistration", "")
    SR = SCHEMA_IRIS.get("SensorReading", "")
    CE = SCHEMA_IRIS.get("ComplianceEvaluation", "")
    SV = SCHEMA_IRIS.get("SatelliteValidation", "")

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
                                schema=SR,  # SensorReading schema
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
    # Two cyclic step blocks:
    # 1. sensor_data_intake: IoT user/API submits SensorReading VCs
    # 2. compliance_evaluation_intake: Middleware submits ComplianceEvaluation VCs
    # Compliance evaluation is handled by middleware-compliance.py which reads
    # SensorReading VCs, runs CPCB Schedule-VI checks, and submits CE VCs.
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
                ],
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
                    # buttonBlockAddon MUST be inside interfaceDocumentsSourceBlock (child of grid).
                    # Events go on the PARENT (registrations_grid) with output=addon's tag.
                    # dialog=True + dialogResultFieldPath="option.status" lets the API set the status.
                    # API call: POST /tag/approve_registration_btn/blocks {"documentId":"...","dialogResult":"Approved"}
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
            block("interfaceContainerBlock", "compliance_monitor_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Sensor Readings Monitor"},
                children=[
                    block("interfaceDocumentsSourceBlock", "monitor_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            # SensorReading fields: field0=timestamp, field1=facilityId, field2=pH,
                            # field3=BOD, field4=COD, field5=TSS, field6=temp, field7=Cr,
                            # field8=hexCr, field9=O&G, field10=NH3N, field11=DO, field12=flow,
                            # field13=sensorStatus, field14=kmsKeyId, field15=kmsSigHash
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
                                schema=SR,  # SensorReading, not ComplianceEvaluation
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
                            {"title": "Facility", "name": "document.credentialSubject.0.field1", "type": "text"},
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
    # Drill-down: Token Mint → Compliance Evaluation → Sensor Reading → Facility Registration
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


def update_policy_blocks(token):
    """Update the policy with the complete block tree."""
    print("Updating policy with block tree...")

    config = build_policy_config()

    # Count blocks
    def count(b):
        return 1 + sum(count(c) for c in b.get("children", []))
    print(f"  Total blocks: {count(config)}")

    # GET current policy
    r = requests.get(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token))
    if r.status_code != 200:
        print(f"  GET policy failed: {r.status_code} {r.text[:500]}")
        return False
    current = r.json()

    # Update fields
    current["config"] = config
    current["policyRoles"] = ["Facility", "SPCB", "VVB", "IoT"]
    current["policyTopics"] = [{
        "name": "Project",
        "description": "Facility registration and compliance data",
        "type": "any",
        "static": False,
        "memoObj": "topic",
    }]
    current["policyTokens"] = []
    current["policyGroups"] = []

    # Remove read-only fields
    for key in ["_id", "id", "createDate", "updateDate", "hashMap", "hashMapFileId",
                "configFileId", "hash", "userRole", "userRoles", "userGroup", "userGroups",
                "tests", "importantParameters"]:
        current.pop(key, None)

    r = requests.put(f"{GUARDIAN_URL}/policies/{POLICY_ID}", headers=headers(token), json=current)
    if r.status_code in [200, 201]:
        print("  Policy updated successfully!")
        return True
    else:
        print(f"  PUT failed: {r.status_code} {r.text[:1000]}")
        return False


def start_dry_run(token):
    """Start dry-run mode."""
    print("Starting dry-run...")
    r = requests.put(
        f"{GUARDIAN_URL}/policies/{POLICY_ID}/dry-run",
        headers={"Authorization": f"Bearer {token}"},
        # No body, no Content-Type!
    )
    if r.status_code in [200, 201]:
        print("  Dry-run started!")
        return True
    else:
        print(f"  Dry-run failed: {r.status_code} {r.text[:500]}")
        return False


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    token = authenticate()

    # Step 1: Create policy
    create_policy(token)

    # Step 2: Create and publish schemas
    create_and_publish_schemas(token)

    # Step 3: Update policy with block tree
    update_policy_blocks(token)

    # Step 4: Save config locally
    out = {
        "guardian_url": GUARDIAN_URL,
        "policy_id": POLICY_ID,
        "policy_topic_id": POLICY_TOPIC_ID,
        "schema_iris": SCHEMA_IRIS,
        "token_ids": {
            "GGCC": GGCC_TOKEN_ID,
            "ZVIOL": ZVIOL_TOKEN_ID,
            "ZCERT": ZCERT_TOKEN_ID,
        },
    }
    out_path = "/Users/akshmnd/Dev Projects/Zeno/guardian/policies/selfhosted-config.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nConfig saved to {out_path}")

    # Step 5: Optionally start dry-run
    if "--dry-run" in sys.argv:
        start_dry_run(token)

    print("\nDone! Open http://165.22.212.120:3000 to see the policy.")
