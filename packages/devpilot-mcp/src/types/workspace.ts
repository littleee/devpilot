export interface DevPilotWorkspaceRecord {
  id: string;
  name: string;
  rootPath: string;
  devServerUrls?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DevPilotRegisterWorkspaceInput {
  rootPath: string;
  name?: string;
  devServerUrls?: string[];
}
