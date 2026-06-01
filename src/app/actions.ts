'use server';

import { revalidatePath } from 'next/cache';
import * as db from '@/lib/db';

export async function getTradersAction() {
  return await db.getTraders();
}

export async function createTraderAction(name: string) {
  const newTrader = await db.createTrader(name);
  revalidatePath('/');
  return newTrader;
}

export async function updateTraderAction(id: string, name: string) {
  const updatedTrader = await db.updateTrader(id, name);
  revalidatePath('/');
  return updatedTrader;
}

export async function deleteTraderAction(id: string) {
  await db.deleteTrader(id);
  revalidatePath('/');
}

export async function getChallengesAction(traderId?: string) {
  return await db.getChallenges(traderId);
}

export async function createChallengeAction(challenge: Omit<db.Challenge, 'id'>) {
  const newChallenge = await db.createChallenge(challenge);
  revalidatePath('/');
  return newChallenge;
}

export async function updateChallengeAction(id: string, challenge: Partial<Omit<db.Challenge, 'id' | 'trader_id'>>) {
  const updated = await db.updateChallenge(id, challenge);
  revalidatePath('/');
  return updated;
}

export async function deleteChallengeAction(id: string) {
  await db.deleteChallenge(id);
  revalidatePath('/');
}
