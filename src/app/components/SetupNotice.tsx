interface SetupNoticeProps {
  title?: string;
  message: string;
}

export function SetupNotice({
  title = 'Supabase setup required',
  message,
}: SetupNoticeProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5">
      <h2 className="text-lg mb-2">{title}</h2>
      <p className="text-sm leading-6">{message}</p>
    </div>
  );
}
