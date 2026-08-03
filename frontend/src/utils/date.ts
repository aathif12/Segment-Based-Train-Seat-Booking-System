export const isPastDeparture = (travelDate: string, departureTime: string): boolean => {
  if (!travelDate || !departureTime) return false;

  // travelDate format: "YYYY-MM-DD"
  // departureTime format: "HH:mm" (or "HH:mm:ss")
  
  const [year, month, day] = travelDate.split('-').map(Number);
  const [hours, minutes] = departureTime.split(':').map(Number);
  
  const departureDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const now = new Date();
  
  return now > departureDate;
};
