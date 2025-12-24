export function ReturnReminder({ isVisible, theme }) {
  if (!isVisible) return null;

  return (
    <div className="return-reminder">
      <p>{theme.reminder}</p>
    </div>
  );
}

