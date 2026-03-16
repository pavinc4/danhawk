import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";

export function CreateModButton() {
  return (
    <Link
      to="/create"
      className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-[#cccccc] text-[13px] font-medium hover:bg-[#222222] hover:border-[#3b8bdb] hover:text-white active:scale-[0.98] transition-all duration-150 shadow-xl shadow-black/40 z-50"
    >
      <Pencil className="w-4 h-4" />
      Create a New Mod
    </Link>
  );
}
