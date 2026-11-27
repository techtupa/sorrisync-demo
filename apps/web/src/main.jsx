import { appendMockTreatmentPlanItem } from '@/repositories/mock/treatmentPlanRepository.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/portfolio/PortfolioApp.jsx';
import '@/index.css';

await appendMockTreatmentPlanItem({ tenantId: 'tenant_aurora', patientId: '84000000-0000-4000-8000-000000000001', serviceId: 'srv_1', priority: 'routine', sequenceNumber: 1, requestId: 'portfolio-casey-plan' }).catch(() => {});
ReactDOM.createRoot(document.getElementById('root')).render(
	<App />
);
