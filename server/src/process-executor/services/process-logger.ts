import { SimpleEvent } from '@aibindkit/core';
import { ProcessLog, ProcessLogLevel } from '@ailaflow/shared';

export class ProcessLogger {
  public readonly onLog = new SimpleEvent<ProcessLog>();

  public info(message: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.INFO, message]);
  }

  public materializerStdout(stdout: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.MATERIALIZER_STDOUT, stdout]);
  }

  public materializerStderr(stderr: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.MATERIALIZER_STDERR, stderr]);
  }

  public scriptStdout(stdout: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.SCRIPT_STDOUT, stdout]);
  }

  public scriptStderr(stderr: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.SCRIPT_STDERR, stderr]);
  }

  public scriptFinished(totalTime: number, code: number) {
    this.onLog.emit([Date.now(), ProcessLogLevel.SCRIPT_FINISHED, totalTime, code]);
  }

  public agentResponse(message: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.AGENT_RESPONSE, message]);
  }

  public agentToolCall(toolCallId: string, functionName: string, args: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.AGENT_TOOL_CALL, toolCallId, functionName, args]);
  }

  public agentToolResponse(toolCallId: string, args: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.AGENT_TOOL_RESPONSE, toolCallId, args]);
  }
}
