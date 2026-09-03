export enum LlmUseCase {
  ADMIN_CHAT = 1,
  USER_CHAT = 2,
  AGENT_STEP = 3
}

export const ALL_LLM_USE_CASES: LlmUseCase[] = [LlmUseCase.ADMIN_CHAT, LlmUseCase.USER_CHAT, LlmUseCase.AGENT_STEP];

export function strLlmUseCase(useCase: LlmUseCase): string {
  switch (useCase) {
    case LlmUseCase.ADMIN_CHAT:
      return 'Admin chat';
    case LlmUseCase.USER_CHAT:
      return 'User chat';
    case LlmUseCase.AGENT_STEP:
      return 'Agent step';
  }
}
