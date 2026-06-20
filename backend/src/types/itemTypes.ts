export interface IItem {
  userId: string;
  name: string;
  daysUntilExpiration: number;
  createdAt?: Date;
  expiryLevel?: string;
}
