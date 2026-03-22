import { http, HttpResponse } from 'msw';
import { createFacility, createReading, createEvaluation } from './factories';

// Helper: wrap data in Guardian VC document format
function wrapInVC(data: Record<string, unknown>) {
  return {
    document: {
      credentialSubject: [data],
    },
  };
}

// Convert facility to field0..field16 format (Guardian schema)
function facilityToFields(f: ReturnType<typeof createFacility>) {
  return {
    field0: f.facilityId,
    field1: f.facilityName,
    field2: f.industryCategory,
    field3: f.state,
    field4: f.district,
    field5: f.gpsLatitude,
    field6: f.gpsLongitude,
    field7: f.ocemsSensorModel,
    field8: f.analyzerSerialNumber,
    field9: f.ctoNumber,
    field10: f.ctoValidUntil,
    field11: f.ctoDischargeMode,
    field12: f.ctoBODLimit,
    field13: f.ctoCODLimit,
    field14: f.ctoTSSLimit,
    field15: f.deviceKmsKeyId,
    field16: f.deviceHederaAccountId,
  };
}

function readingToFields(r: ReturnType<typeof createReading>) {
  return {
    field0: r.timestamp,
    field1: r.facilityId,
    field2: r.pH,
    field3: r.BOD_mgL,
    field4: r.COD_mgL,
    field5: r.TSS_mgL,
    field6: r.temperature_C,
    field7: r.totalChromium_mgL,
    field8: r.hexChromium_mgL,
    field9: r.oilAndGrease_mgL,
    field10: r.ammoniacalN_mgL,
    field11: r.dissolvedOxygen_mgL,
    field12: r.flow_KLD,
    field13: r.sensorStatus,
    field14: r.kmsKeyId,
    field15: r.kmsSigHash,
  };
}

function evaluationToFields(e: ReturnType<typeof createEvaluation>) {
  return {
    field0: e.evaluationId,
    field1: e.facilityId,
    field2: e.evaluatedAt,
    field3: e.limitsSource,
    field4: e.isZLD,
    field5: e.pH_compliant,
    field6: e.pH_value,
    field7: e.BOD_compliant,
    field8: e.BOD_value,
    field9: e.COD_compliant,
    field10: e.COD_value,
    field11: e.TSS_compliant,
    field12: e.TSS_value,
    field13: e.temp_compliant,
    field14: e.temp_value,
    field15: e.chromium_compliant,
    field16: e.chromium_value,
    field17: e.overallCompliant,
    field18: e.violationCount,
    field19: e.criticalViolationCount,
    field20: e.tokenAction,
  };
}

export const handlers = [
  // Guardian login
  http.post('*/accounts/login', () => {
    return HttpResponse.json({ refreshToken: 'mock-refresh-token' });
  }),

  // Guardian access-token
  http.post('*/accounts/access-token', () => {
    return HttpResponse.json({ accessToken: 'mock-access-token' });
  }),

  // Guardian registrations grid
  http.get('*/tag/registrations_grid/blocks', () => {
    const f = createFacility();
    return HttpResponse.json({ data: [wrapInVC(facilityToFields(f))] });
  }),

  // Guardian monitor grid
  http.get('*/tag/monitor_grid/blocks', () => {
    const r = createReading();
    return HttpResponse.json({ data: [wrapInVC(readingToFields(r))] });
  }),

  // Guardian evaluations grid
  http.get('*/tag/evaluations_grid/blocks', () => {
    const e = createEvaluation();
    return HttpResponse.json({ data: [wrapInVC(evaluationToFields(e))] });
  }),

  // Mirror Node
  http.get('*/api/v1/*', () => {
    return HttpResponse.json({ tokens: [], messages: [], balance: {} });
  }),

  // Satellite validate
  http.get('*/validate*', () => {
    return HttpResponse.json({
      status: 'validated',
      satellite: { ndti: 0.12, turbidity_ntu: 15.3, image_date: '2026-03-18' },
      validation: { satellite_validated: true, anomaly_flag: false, correlation_confidence: 'high' },
    });
  }),

  // Satellite health
  http.get('*/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
