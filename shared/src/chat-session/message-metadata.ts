export interface ProcessReturnFormMessageMetadata {
  name: string;
  stepId: string;
  hasForm: boolean;
}

export interface ProcessStartFormMessageMetadata {
  name: string;
}

export interface TaskFormMessageMetadata {
  title: string;
}
