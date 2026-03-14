export type Receipt = {
  id: string;
  ts: string;
  action: string;
  status: 'allowed' | 'blocked' | 'executed';
  prevHash?: string;
  hash: string;
};
