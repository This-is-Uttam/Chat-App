export function formatDate(date: string | Date) {
  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: string | Date) {
  const parsedDate = new Date(date);

  return parsedDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}