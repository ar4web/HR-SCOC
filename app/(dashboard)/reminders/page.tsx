import { redirect } from 'next/navigation';

/** Reminders now live inside the merged Tasks & Reminders page. */
export default function RemindersPage() {
  redirect('/todos?tab=reminders');
}
