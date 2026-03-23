# Guardian Schemas

Six Verifiable Credential schemas used by the Hestia policy. Each schema maps to a specific step in the wildfire mitigation lifecycle.

| Schema | Fields | Used by |
|--------|--------|---------|
| SiteRegistration | 14 | Land Manager registers a treatment site |
| TreatmentPlan | 10 | Operator plans prescribed burn / thinning |
| TreatmentReport | 12 | Operator reports completed work |
| SatelliteValidation | 8 | Satellite analyst records independent verification |
| RiskAssessment | 18 | Satellite analyst scores risk + triggers WRC mint |
| InsuranceImpact | 12 | Records premium discount + parametric trigger status |

The `SatelliteValidation.json` file in this directory is the Hestia-specific schema. Other schemas are defined inline in the Guardian policy deployment script (`../scripts/deploy-selfhosted.py`).
