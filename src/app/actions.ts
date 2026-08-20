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

export async function getPayoutsAction(traderId?: string) {
  return await db.getPayouts(traderId);
}

export async function createPayoutAction(payout: Omit<db.Payout, 'id'>) {
  const newPayout = await db.createPayout(payout);
  revalidatePath('/');
  return newPayout;
}

export async function updatePayoutAction(id: string, payout: Partial<Omit<db.Payout, 'id' | 'trader_id'>>) {
  const updated = await db.updatePayout(id, payout);
  revalidatePath('/');
  return updated;
}

export async function deletePayoutAction(id: string) {
  await db.deletePayout(id);
  revalidatePath('/');
}

export async function getTripDataAction() {
  return await db.getTripData();
}

export async function createTripParticipantAction(name: string, isMe = false) {
  const participant = await db.createTripParticipant(name, isMe);
  revalidatePath('/voyage');
  return participant;
}

export async function setTripParticipantAsMeAction(id: string) {
  await db.setTripParticipantAsMe(id);
  revalidatePath('/voyage');
}

export async function deleteTripParticipantAction(id: string) {
  await db.deleteTripParticipant(id);
  revalidatePath('/voyage');
}

export async function createTripExpenseAction(input: db.CreateTripExpenseInput) {
  const result = await db.createTripExpense(input);
  revalidatePath('/voyage');
  return result;
}

export async function deleteTripExpenseAction(id: string) {
  await db.deleteTripExpense(id);
  revalidatePath('/voyage');
}

export async function createTripCreditAction(input: db.CreateTripCreditInput) {
  const credit = await db.createTripCredit(input);
  revalidatePath('/voyage');
  return credit;
}

export async function deleteTripCreditAction(id: string) {
  await db.deleteTripCredit(id);
  revalidatePath('/voyage');
}
