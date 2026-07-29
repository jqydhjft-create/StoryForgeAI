import { redactDiagnosticText } from './diagnosticsRedaction';

export interface WorkflowLogsProps {
  workflowLog: string[];
}

export function WorkflowLogs({ workflowLog }: WorkflowLogsProps) {
  return (
    <section className="settings-diagnostics-section workflow-logs" aria-labelledby="workflow-logs-heading">
      <h2 id="workflow-logs-heading">Workflow logs</h2>
      {workflowLog.length > 0 ? (
        <ol>
          {workflowLog.map((entry, index) => <li key={`${entry}-${index}`}>{redactDiagnosticText(entry)}</li>)}
        </ol>
      ) : (
        <p>No workflow activity recorded in this session.</p>
      )}
    </section>
  );
}
