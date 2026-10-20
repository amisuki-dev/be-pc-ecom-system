import { v4 as uuidv4 } from 'uuid';

export const generateCode = (): string => uuidv4().slice(0, 30);