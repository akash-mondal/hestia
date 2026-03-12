#!/usr/bin/env python3
"""
Build and push the Zeno dMRV policy block tree to MGS via API.

Schema UUIDs (deployed on MGS):
  FacilityRegistration: #7d973058-189e-4240-9270-0c3b3e85c934
  SensorReading:        #ed0e5f60-3bc6-4073-bbcf-f6677e1797fd
  ComplianceEvaluation: #ce094ef7-ed20-4aa8-ad68-b110ca466582
  SatelliteValidation:  #1f1241a7-eb7e-4f11-8d7c-51a8aa224990
"""

import json
import uuid
import requests
import sys

# MGS Config
MGS_URL = "https://guardianservice.app/api/v1"
USERNAME = "akash-m"
PASSWORD = "akash17327"
TENANT_ID = "69b0e1a5b519ad433329ea73"
POLICY_ID = "69b14a152a75f6d261a646dc"

# Schema IRIs
# Schema IRIs — these are on the policy topic (0.0.8162597), DRAFT status
FACILITY_REG = "#3037a243-dec7-438a-83fa-1d9174855e45"
SENSOR_READING = "#241302d0-75ff-47d3-bfa5-46d355e9e9a2"
COMPLIANCE_EVAL = "#db6734dd-2ccd-4ee3-8f6b-c129503f9215"
SATELLITE_VAL = "#b57b43c6-91ce-479d-983d-65cdea7a7d95"

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
COMPLIANCE_JS = r"""
(function() {
  var cs = Array.isArray(doc.document.credentialSubject)
    ? doc.document.credentialSubject[0]
    : doc.document.credentialSubject;

  if (!cs) { done(null); return; }

  var LIMITS = {
    pH: { min: 5.5, max: 9.0, type: 'range' },
    BOD_mgL: { max: 30, type: 'max' },
    COD_mgL: { max: 250, type: 'max' },
    TSS_mgL: { max: 100, type: 'max' },
    temperature_C: { max: 40, type: 'max' },
    totalChromium_mgL: { max: 2.0, type: 'max' },
    hexChromium_mgL: { max: 0.1, type: 'max' },
    oilAndGrease_mgL: { max: 10, type: 'max' },
    ammoniacalN_mgL: { max: 50, type: 'max' }
  };

  var violationCount = 0;
  var criticalCount = 0;
  var pH_compliant = true, pH_value = cs.pH || 0;
  var BOD_compliant = true, BOD_value = cs.BOD_mgL || 0;
  var COD_compliant = true, COD_value = cs.COD_mgL || 0;
  var TSS_compliant = true, TSS_value = cs.TSS_mgL || 0;
  var temp_compliant = true, temp_value = cs.temperature_C || 0;
  var chromium_compliant = true, chromium_value = cs.totalChromium_mgL || 0;

  // pH range check
  if (pH_value < 5.5 || pH_value > 9.0) { pH_compliant = false; violationCount++; }
  // BOD
  if (BOD_value > 30) { BOD_compliant = false; violationCount++; if (BOD_value > 45) criticalCount++; }
  // COD
  if (COD_value > 250) { COD_compliant = false; violationCount++; if (COD_value > 375) criticalCount++; }
  // TSS
  if (TSS_value > 100) { TSS_compliant = false; violationCount++; if (TSS_value > 150) criticalCount++; }
  // Temperature
  if (temp_value > 40) { temp_compliant = false; violationCount++; }
  // Chromium
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
    evaluationId: 'EVAL-' + Date.now(),
    facilityId: cs.facilityId || '',
    evaluatedAt: new Date().toISOString(),
    limitsSource: 'schedule_vi',
    isZLD: false,
    pH_compliant: pH_compliant,
    pH_value: pH_value,
    BOD_compliant: BOD_compliant,
    BOD_value: BOD_value,
    COD_compliant: COD_compliant,
    COD_value: COD_value,
    TSS_compliant: TSS_compliant,
    TSS_value: TSS_value,
    temp_compliant: temp_compliant,
    temp_value: temp_value,
    chromium_compliant: chromium_compliant,
    chromium_value: chromium_value,
    overallCompliant: overallCompliant,
    violationCount: violationCount,
    criticalViolationCount: criticalCount,
    tokenAction: tokenAction
  };

  done(evaluation);
})();
"""


def build_policy_config():
    """Build the complete Zeno policy block tree."""

    # ── Token IDs (Hedera token IDs, referenced by mintDocumentBlock) ──
    GGCC_TOKEN_ID = "0.0.8163838"
    ZVIOL_TOKEN_ID = "0.0.8163841"
    ZCERT_TOKEN_ID = "0.0.8163843"

    # ════════════════════════════════════════════════════════════
    # FACILITY WORKFLOW
    # ════════════════════════════════════════════════════════════

    facility_steps = block("interfaceStepBlock", "facility_steps",
        permissions=["Facility"],
        uiMetaData={"type": "blank"},
        children=[
            # 1. Registration form
            block("requestVcDocumentBlock", "facility_registration_form",
                permissions=["Facility"],
                uiMetaData={"type": "page", "title": "Facility Registration"},
                schema=FACILITY_REG,
                idType="OWNER",
                presetFields=[],
            ),
            # 2. Save to Hedera
            block("sendToGuardianBlock", "save_registration_hedera",
                permissions=["Facility"],
                dataSource="hedera",
                documentType="vc",
                entityType="registrant",
                topic="Project",
                topicOwner="user",
                options=[],
                dataType="",
            ),
            # 3. Save to DB with status
            block("sendToGuardianBlock", "save_registration_db",
                permissions=["Facility"],
                dataSource="database",
                documentType="vc",
                entityType="registrant",
                options=[{"name": "status", "value": "Waiting for approval"}],
                dataType="",
            ),
            # 4. Wait for approval message
            block("informationBlock", "wait_for_approval",
                permissions=["Facility"],
                uiMetaData={
                    "type": "text",
                    "title": "Registration Submitted",
                    "description": "Your facility registration has been submitted. The page will refresh automatically once SPCB approves."
                },
                stopPropagation=True,
            ),
            # 5. On approve: update status
            block("sendToGuardianBlock", "save_registration_status_approved",
                permissions=["Facility"],
                dataSource="database",
                documentType="vc",
                entityType="registrant",
                options=[{"name": "status", "value": "Approved"}],
                dataType="",
                events=[{
                    "target": "registrations_grid",
                    "source": "save_registration_status_approved",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": False
                }],
            ),
            # 6. Re-sign by CPCB (Standard Registry)
            block("reassigningBlock", "sign_by_cpcb",
                permissions=["Facility"],
                issuer="policyOwner",
                actor="owner",
            ),
            # 7. Save signed copy to Hedera
            block("sendToGuardianBlock", "save_signed_registration_hedera",
                permissions=["Facility"],
                dataSource="hedera",
                documentType="vc",
                entityType="registrant(Approved)",
                topic="Project",
                topicOwner="owner",
                options=[],
            ),
            # 8. Save signed copy to DB
            block("sendToGuardianBlock", "save_signed_registration_db",
                permissions=["Facility"],
                dataSource="database",
                documentType="vc",
                entityType="registrant(Approved)",
                forceNew=True,
                options=[{"name": "status", "value": "Approved"}],
                dataType="",
            ),
            # 9. Facility dashboard (post-approval)
            block("interfaceContainerBlock", "facility_dashboard",
                permissions=["Facility"],
                uiMetaData={"type": "tabs"},
                children=[
                    # Tab 1: My Compliance
                    block("interfaceContainerBlock", "my_compliance_page",
                        permissions=["Facility"],
                        uiMetaData={"type": "blank", "title": "My Compliance"},
                        children=[
                            block("interfaceDocumentsSourceBlock", "compliance_grid",
                                permissions=["Facility"],
                                uiMetaData={"fields": [
                                    {"title": "Evaluation ID", "name": "document.credentialSubject.0.evaluationId", "type": "text"},
                                    {"title": "Facility", "name": "document.credentialSubject.0.facilityId", "type": "text"},
                                    {"title": "Compliant", "name": "document.credentialSubject.0.overallCompliant", "type": "text"},
                                    {"title": "Token Action", "name": "document.credentialSubject.0.tokenAction", "type": "text"},
                                    {"title": "Evaluated At", "name": "document.credentialSubject.0.evaluatedAt", "type": "text"},
                                ]},
                                children=[
                                    block("documentsSourceAddon", "compliance_source",
                                        permissions=["Facility"],
                                        schema=COMPLIANCE_EVAL,
                                        dataType="vc-documents",
                                        filters=[{"type": "equal", "field": "owner", "value": "currentUser"}],
                                    ),
                                ],
                            ),
                        ],
                    ),
                    # Tab 2: My Tokens
                    block("interfaceContainerBlock", "my_tokens_page",
                        permissions=["Facility"],
                        uiMetaData={"type": "blank", "title": "My Tokens"},
                        children=[
                            block("interfaceDocumentsSourceBlock", "tokens_grid",
                                permissions=["Facility"],
                                uiMetaData={"fields": [
                                    {"title": "Token", "name": "tokenId", "type": "text"},
                                    {"title": "Date", "name": "createDate", "type": "text"},
                                ]},
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
            ),
            # 10. On reject: update status
            block("sendToGuardianBlock", "save_registration_status_rejected",
                permissions=["Facility"],
                dataSource="database",
                documentType="vc",
                entityType="registrant",
                options=[{"name": "status", "value": "Rejected"}],
                dataType="",
            ),
            # 11. Rejection message
            block("informationBlock", "registration_rejected",
                permissions=["Facility"],
                uiMetaData={
                    "type": "text",
                    "title": "Registration Rejected",
                    "description": "Your facility registration was rejected by SPCB. Please resubmit with corrections."
                },
            ),
        ],
    )

    facility_workflow = block("interfaceContainerBlock", "facility_workflow",
        permissions=["Facility"],
        uiMetaData={"type": "blank"},
        children=[facility_steps],
    )

    # ════════════════════════════════════════════════════════════
    # IoT WORKFLOW (sensor data ingestion + compliance)
    # ════════════════════════════════════════════════════════════

    iot_workflow = block("interfaceContainerBlock", "iot_workflow",
        permissions=["IoT"],
        uiMetaData={"type": "blank"},
        children=[
            # 1. External data intake
            block("externalDataBlock", "sensor_data_intake",
                permissions=["IoT"],
                entityType="MRV",
                schema=SENSOR_READING,
            ),
            # 2. Validate reading
            block("documentValidatorBlock", "validate_reading",
                permissions=["IoT"],
                schema=SENSOR_READING,
                documentType="vc-document",
                conditions=[],
            ),
            # 3. Compliance check (customLogicBlock)
            block("customLogicBlock", "compliance_check",
                permissions=["IoT"],
                outputSchema=COMPLIANCE_EVAL,
                expression=COMPLIANCE_JS.strip(),
            ),
            # 4. Save evaluation to Hedera
            block("sendToGuardianBlock", "save_evaluation_hedera",
                permissions=["IoT"],
                dataSource="hedera",
                documentType="vc",
                entityType="evaluation",
                topic="Project",
                topicOwner="owner",
                options=[],
            ),
            # 5. Save evaluation to DB
            block("sendToGuardianBlock", "save_evaluation_db",
                permissions=["IoT"],
                dataSource="database",
                documentType="vc",
                entityType="evaluation",
                options=[],
                dataType="",
            ),
            # 6. Compliance router (switchBlock)
            block("switchBlock", "compliance_router",
                permissions=["IoT"],
                executionFlow="firstTrue",
                conditions=[
                    {
                        "tag": "compliant_path",
                        "type": "equal",
                        "field": "document.credentialSubject.0.tokenAction",
                        "value": "mint_ggcc"
                    },
                    {
                        "tag": "violation_path",
                        "type": "equal",
                        "field": "document.credentialSubject.0.tokenAction",
                        "value": "mint_violation_nft"
                    },
                    {
                        "tag": "review_path",
                        "type": "equal",
                        "field": "document.credentialSubject.0.tokenAction",
                        "value": "pending_review"
                    },
                ],
                children=[
                    # Compliant path
                    block("interfaceContainerBlock", "compliant_path",
                        permissions=["IoT"],
                        uiMetaData={"type": "blank"},
                        children=[
                            block("sendToGuardianBlock", "save_compliant",
                                permissions=["IoT"],
                                dataSource="database",
                                documentType="vc",
                                entityType="evaluation(Compliant)",
                                options=[{"name": "status", "value": "Compliant"}],
                                dataType="",
                            ),
                            block("mintDocumentBlock", "mint_ggcc",
                                permissions=["IoT"],
                                tokenId=GGCC_TOKEN_ID,
                                rule="1",
                                accountType="default",
                                events=[{
                                    "target": "compliance_grid",
                                    "source": "mint_ggcc",
                                    "input": "RefreshEvent",
                                    "output": "RunEvent",
                                    "actor": "",
                                    "disabled": False
                                }],
                            ),
                        ],
                    ),
                    # Violation path
                    block("interfaceContainerBlock", "violation_path",
                        permissions=["IoT"],
                        uiMetaData={"type": "blank"},
                        children=[
                            block("sendToGuardianBlock", "save_violation",
                                permissions=["IoT"],
                                dataSource="database",
                                documentType="vc",
                                entityType="evaluation(Violation)",
                                options=[{"name": "status", "value": "Violation"}],
                                dataType="",
                            ),
                            block("mintDocumentBlock", "mint_violation_nft",
                                permissions=["IoT"],
                                tokenId=ZVIOL_TOKEN_ID,
                                rule="1",
                                accountType="default",
                                events=[{
                                    "target": "violations_grid",
                                    "source": "mint_violation_nft",
                                    "input": "RefreshEvent",
                                    "output": "RunEvent",
                                    "actor": "",
                                    "disabled": False
                                }],
                            ),
                        ],
                    ),
                    # Review path
                    block("interfaceContainerBlock", "review_path",
                        permissions=["IoT"],
                        uiMetaData={"type": "blank"},
                        children=[
                            block("sendToGuardianBlock", "save_for_review",
                                permissions=["IoT"],
                                dataSource="database",
                                documentType="vc",
                                entityType="evaluation(PendingReview)",
                                options=[{"name": "status", "value": "Pending Review"}],
                                dataType="",
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ════════════════════════════════════════════════════════════
    # SPCB WORKFLOW (approvals + monitoring)
    # ════════════════════════════════════════════════════════════

    spcb_workflow = block("interfaceContainerBlock", "spcb_workflow",
        permissions=["SPCB"],
        uiMetaData={"type": "tabs"},
        children=[
            # Tab 1: Pending Registrations
            block("interfaceContainerBlock", "pending_registrations_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Facility Registrations"},
                children=[
                    block("interfaceDocumentsSourceBlock", "registrations_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.facilityName", "type": "text"},
                            {"title": "Industry", "name": "document.credentialSubject.0.industryCategory", "type": "text"},
                            {"title": "State", "name": "document.credentialSubject.0.state", "type": "text"},
                            {"title": "CTO Number", "name": "document.credentialSubject.0.ctoNumber", "type": "text"},
                            {"title": "Status", "name": "option.status", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "registrations_need_approve",
                                permissions=["SPCB"],
                                schema=FACILITY_REG,
                                dataType="vc-documents",
                                filters=[{"type": "equal", "field": "option.status", "value": "Waiting for approval"}],
                            ),
                            block("documentsSourceAddon", "registrations_approved",
                                permissions=["SPCB"],
                                schema=FACILITY_REG,
                                dataType="vc-documents",
                                filters=[{"type": "equal", "field": "option.status", "value": "Approved"}],
                            ),
                        ],
                    ),
                    block("buttonBlock", "approve_registration_btn",
                        permissions=["SPCB"],
                        type="selector",
                        field="option.status",
                        uiMetaData={"buttons": [
                            {"tag": "Option_0", "name": "Approve", "type": "selector", "filters": [], "field": "option.status", "value": "Approved", "uiClass": "btn-approve"},
                            {"tag": "Option_1", "name": "Reject", "type": "selector", "filters": [], "field": "option.status", "value": "Rejected", "uiClass": "btn-reject"},
                        ]},
                        events=[
                            {"target": "save_registration_status_approved", "source": "approve_registration_btn", "input": "RunEvent", "output": "Option_0", "actor": "owner", "disabled": False},
                            {"target": "save_registration_status_rejected", "source": "approve_registration_btn", "input": "RunEvent", "output": "Option_1", "actor": "owner", "disabled": False},
                        ],
                    ),
                ],
            ),
            # Tab 2: Violations
            block("interfaceContainerBlock", "violations_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Violations"},
                children=[
                    block("interfaceDocumentsSourceBlock", "violations_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.facilityId", "type": "text"},
                            {"title": "Violation Count", "name": "document.credentialSubject.0.violationCount", "type": "text"},
                            {"title": "Critical", "name": "document.credentialSubject.0.criticalViolationCount", "type": "text"},
                            {"title": "Action", "name": "document.credentialSubject.0.tokenAction", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.evaluatedAt", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "violations_source",
                                permissions=["SPCB"],
                                schema=COMPLIANCE_EVAL,
                                dataType="vc-documents",
                                filters=[{"type": "equal", "field": "option.status", "value": "Violation"}],
                            ),
                        ],
                    ),
                ],
            ),
            # Tab 3: All Compliance
            block("interfaceContainerBlock", "compliance_monitor_page",
                permissions=["SPCB"],
                uiMetaData={"type": "blank", "title": "Compliance Monitor"},
                children=[
                    block("interfaceDocumentsSourceBlock", "monitor_grid",
                        permissions=["SPCB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.facilityId", "type": "text"},
                            {"title": "Compliant", "name": "document.credentialSubject.0.overallCompliant", "type": "text"},
                            {"title": "pH", "name": "document.credentialSubject.0.pH_value", "type": "text"},
                            {"title": "BOD", "name": "document.credentialSubject.0.BOD_value", "type": "text"},
                            {"title": "COD", "name": "document.credentialSubject.0.COD_value", "type": "text"},
                            {"title": "TSS", "name": "document.credentialSubject.0.TSS_value", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.evaluatedAt", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "monitor_source",
                                permissions=["SPCB"],
                                schema=COMPLIANCE_EVAL,
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ════════════════════════════════════════════════════════════
    # VVB WORKFLOW (verification)
    # ════════════════════════════════════════════════════════════

    vvb_workflow = block("interfaceContainerBlock", "vvb_workflow",
        permissions=["VVB"],
        uiMetaData={"type": "tabs"},
        children=[
            # Tab 1: Flagged for Review
            block("interfaceContainerBlock", "flagged_violations_page",
                permissions=["VVB"],
                uiMetaData={"type": "blank", "title": "Pending Review"},
                children=[
                    block("interfaceDocumentsSourceBlock", "flagged_grid",
                        permissions=["VVB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.facilityId", "type": "text"},
                            {"title": "Violations", "name": "document.credentialSubject.0.violationCount", "type": "text"},
                            {"title": "Action", "name": "document.credentialSubject.0.tokenAction", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.evaluatedAt", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "flagged_source",
                                permissions=["VVB"],
                                schema=COMPLIANCE_EVAL,
                                dataType="vc-documents",
                                filters=[{"type": "equal", "field": "option.status", "value": "Pending Review"}],
                            ),
                        ],
                    ),
                ],
            ),
            # Tab 2: Satellite Data
            block("interfaceContainerBlock", "satellite_data_page",
                permissions=["VVB"],
                uiMetaData={"type": "blank", "title": "Satellite Validation"},
                children=[
                    block("interfaceDocumentsSourceBlock", "satellite_grid",
                        permissions=["VVB"],
                        uiMetaData={"fields": [
                            {"title": "Facility", "name": "document.credentialSubject.0.facilityId", "type": "text"},
                            {"title": "NDTI", "name": "document.credentialSubject.0.NDTI_value", "type": "text"},
                            {"title": "Turbidity", "name": "document.credentialSubject.0.turbidity_NTU", "type": "text"},
                            {"title": "Correlation", "name": "document.credentialSubject.0.correlationScore", "type": "text"},
                            {"title": "Date", "name": "document.credentialSubject.0.sentinelTileDate", "type": "text"},
                        ]},
                        children=[
                            block("documentsSourceAddon", "satellite_source",
                                permissions=["VVB"],
                                schema=SATELLITE_VAL,
                                dataType="vc-documents",
                                filters=[],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )

    # ════════════════════════════════════════════════════════════
    # VP + TRUST CHAIN (visible to Standard Registry / OWNER)
    # ════════════════════════════════════════════════════════════

    vp_section = block("interfaceContainerBlock", "VP",
        permissions=["OWNER"],
        uiMetaData={"type": "blank", "title": "VP"},
        children=[
            block("interfaceDocumentsSourceBlock", "vp_grid",
                permissions=["OWNER"],
                uiMetaData={},
                children=[
                    block("documentsSourceAddon", "vp_source",
                        permissions=["OWNER"],
                        dataType="vp-documents",
                        filters=[],
                    ),
                ],
            ),
        ],
    )

    trust_chain = block("interfaceContainerBlock", "trust_chain",
        permissions=["OWNER"],
        uiMetaData={"type": "blank", "title": "Trust Chain"},
        children=[
            block("reportBlock", "trustChainBlock",
                permissions=["OWNER"],
                children=[
                    block("reportItemBlock", "MintTokenItem",
                        permissions=["OWNER"],
                        filters=[],
                        dynamicFilters=[],
                        visible=True,
                        iconType="COMMON",
                        icon="token",
                        title="Token Mint",
                        description="Minted compliance/violation token",
                        multiple=False,
                    ),
                    block("reportItemBlock", "evaluation_report",
                        permissions=["OWNER"],
                        filters=[],
                        dynamicFilters=[],
                        visible=True,
                        iconType="COMMON",
                        icon="report",
                        title="Compliance Evaluation",
                        description="CPCB Schedule-VI compliance check result",
                        multiple=False,
                    ),
                    block("reportItemBlock", "reading_report",
                        permissions=["OWNER"],
                        filters=[],
                        dynamicFilters=[],
                        visible=True,
                        iconType="COMMON",
                        icon="report",
                        title="Sensor Reading",
                        description="OCEMS sensor data with KMS signature",
                        multiple=True,
                    ),
                    block("reportItemBlock", "facility_report_approved",
                        permissions=["OWNER"],
                        filters=[],
                        dynamicFilters=[],
                        visible=True,
                        iconType="COMMON",
                        icon="report",
                        title="Facility Registration (Approved)",
                        description="SPCB-approved facility registration",
                        multiple=False,
                    ),
                    block("reportItemBlock", "facility_report_submit",
                        permissions=["OWNER"],
                        filters=[],
                        dynamicFilters=[],
                        visible=True,
                        iconType="COMMON",
                        icon="report",
                        title="Facility Registration (Submitted)",
                        description="Original facility registration submission",
                        multiple=False,
                    ),
                ],
            ),
        ],
    )

    # ════════════════════════════════════════════════════════════
    # ROOT POLICY CONFIG
    # ════════════════════════════════════════════════════════════

    root = block("interfaceContainerBlock", "",
        permissions=["ANY_ROLE"],
        uiMetaData={"type": "blank"},
        children=[
            # 1. Role selection
            block("policyRolesBlock", "choose_role",
                permissions=["NO_ROLE"],
                uiMetaData={"title": "Registration", "description": "Choose your role in the Zeno dMRV system"},
                roles=["Facility", "SPCB", "VVB", "IoT"],
            ),
            # 2. Facility workflow
            facility_workflow,
            # 3. IoT workflow
            iot_workflow,
            # 4. SPCB workflow
            spcb_workflow,
            # 5. VVB workflow
            vvb_workflow,
            # 6. VP section
            vp_section,
            # 7. Trust chain
            trust_chain,
        ],
    )

    return root


def build_policy_update():
    """Build the full policy update payload."""
    config = build_policy_config()

    # Policy-level metadata
    update = {
        "config": config,
        "policyRoles": ["Facility", "SPCB", "VVB", "IoT"],
        "policyTopics": [
            {
                "name": "Project",
                "description": "Facility registration and compliance data",
                "type": "any",
                "static": False,
                "memoObj": "topic",
            }
        ],
        "policyTokens": [],
        "policyGroups": [],
    }

    return update


def authenticate():
    """Login to MGS and get access token."""
    print("Authenticating with MGS...")

    # Login
    r = requests.post(f"{MGS_URL}/accounts/login", json={
        "username": USERNAME,
        "password": PASSWORD,
        "tenantId": TENANT_ID,
    })
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        sys.exit(1)
    refresh_token = r.json()["refreshToken"]

    # Get access token
    r = requests.post(f"{MGS_URL}/accounts/access-token", json={
        "refreshToken": refresh_token,
    })
    if r.status_code not in [200, 201]:
        print(f"Access token failed: {r.status_code} {r.text}")
        sys.exit(1)
    access_token = r.json()["accessToken"]
    print("Authenticated successfully.")
    return access_token


def push_policy(token, update):
    """PUT the policy update to MGS."""
    print(f"Pushing policy config ({len(json.dumps(update))} bytes)...")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # First GET current policy to merge
    r = requests.get(f"{MGS_URL}/policies/{POLICY_ID}", headers=headers)
    if r.status_code != 200:
        print(f"GET policy failed: {r.status_code} {r.text}")
        sys.exit(1)
    current = r.json()

    # Merge our updates into the current policy
    current["config"] = update["config"]
    current["policyRoles"] = update["policyRoles"]
    current["policyTopics"] = update["policyTopics"]
    current["policyTokens"] = update["policyTokens"]
    current["policyGroups"] = update["policyGroups"]

    # Remove read-only fields that shouldn't be sent back
    for key in ["_id", "id", "createDate", "updateDate", "hashMap", "hashMapFileId",
                "configFileId", "hash", "userRole", "userRoles", "userGroup", "userGroups",
                "tests", "importantParameters"]:
        current.pop(key, None)

    # PUT updated policy
    r = requests.put(f"{MGS_URL}/policies/{POLICY_ID}", headers=headers, json=current)
    if r.status_code in [200, 201]:
        print("Policy updated successfully!")
        return True
    else:
        print(f"PUT failed: {r.status_code}")
        print(r.text[:2000])
        return False


def count_blocks(config, depth=0):
    """Count total blocks in config tree."""
    count = 1
    for c in config.get("children", []):
        count += count_blocks(c, depth + 1)
    return count


if __name__ == "__main__":
    update = build_policy_update()
    config = update["config"]

    total = count_blocks(config)
    print(f"Built policy config with {total} blocks")
    print(f"Roles: {update['policyRoles']}")
    print(f"Tokens: {[t['tokenSymbol'] for t in update['policyTokens']]}")
    print(f"Topics: {[t['name'] for t in update['policyTopics']]}")

    # Save locally
    out_path = "/Users/akshmnd/Dev Projects/Zeno/guardian/policies/zeno-dmrv-v1.policy.json"
    with open(out_path, "w") as f:
        json.dump(update, f, indent=2)
    print(f"Saved to {out_path}")

    # Push to MGS
    if "--push" in sys.argv:
        token = authenticate()
        push_policy(token, update)
    elif "--dry-run" in sys.argv:
        # Just print config summary
        def walk(b, d=0):
            print(f"{'  '*d}{b['blockType']} [{b.get('tag','')}]")
            for c in b.get("children", []):
                walk(c, d+1)
        walk(config)
    else:
        print("\nUsage:")
        print("  python3 build-policy.py --dry-run   # Preview block tree")
        print("  python3 build-policy.py --push      # Push to MGS")
