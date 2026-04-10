export interface Nomination {
  id: number;
  nominatorName: string;
  nominatorTeam: string;
  nomineeEmployeeId: string;
  nomineeName: string;
  nominationText: string;
  createdAt: string;
}

export interface NominationSubmission {
  nominatorName: string;
  nominatorTeam: string;
  nomineeEmployeeId: string;
  nominationText: string;
}
