import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const modules = [
  ['Omnichannel', '/omnichannel', 'Workflow automation and applied AI', 'Generate a simulated draft and submit the sample appointment request to SQLite.'],
  ['Schedule', '/agenda', 'React and scheduling rules', 'Open the in-memory appointment preview and inspect the day or week schedule.'],
  ['Front desk', '/modo-recepcao', 'Operational UX', 'Review the saved request, reload to see the persisted decision and history, then prepare the calendar preview.'],
  ['Patient CRM', '/pacientes', 'Product design and data modeling', 'Explore the patient list, pipeline, and patient context.'],
  ['Clinical record', '/prontuario?patient=84000000-0000-4000-8000-000000000001', 'Linked workflows and structured records', 'Select a fictional patient and inspect their clinical timeline and treatment workspace.'],
  ['Finance', '/financeiro', 'Business rules and auditability', 'Inspect a fictional receivable and the effect of a partial receipt on its outstanding balance.'],
  ['Inventory', '/estoque', 'Operational controls', 'Inspect stock and a simulated purchase order with a partial receipt.'],
];

export default function PortfolioGuide() {
  return <Layout>
    <div className="space-y-5">
      <div><Badge variant="outline">Synthetic data</Badge><h1 className="mt-3 text-3xl font-bold">Portfolio walkthrough</h1>
        <p className="mt-2 text-muted-foreground">Follow one fictional case through the original SorriSync screens. Use the clinic switcher to compare a manager in Aurora with a read-only reviewer in Harbor.</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        {modules.map(([name, path, skill, action]) => <Card key={path}><CardContent className="p-5">
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" to={path}>{name}</Link>
          <div className="mt-2 text-sm font-medium">{skill}</div><p className="mt-1 text-sm text-muted-foreground">{action}</p>
        </CardContent></Card>)}
      </div>
    </div>
  </Layout>;
}
