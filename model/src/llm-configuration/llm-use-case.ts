export enum LlmUseCase {
  ADMIN_CHAT = 1,
  USER_CHAT = 2
}

export function strLlmUseCase(useCase: LlmUseCase): string {
  switch (useCase) {
    case LlmUseCase.ADMIN_CHAT:
      return 'Admin chat';
    case LlmUseCase.USER_CHAT:
      return 'User chat';
  }
}
