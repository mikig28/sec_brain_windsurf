interface WhatsAppMessageProps {
  content: string;
  timestamp: string;
  isOutgoing?: boolean;
}

export function WhatsAppMessage({ content, timestamp, isOutgoing = true }: WhatsAppMessageProps) {
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1 px-2`}>
      <div 
        className={`relative max-w-[65%] rounded-lg py-2 px-2.5 text-sm
          ${isOutgoing ? 'bg-[#E0FCD9] dark:bg-[#025C4C]' : 'bg-white dark:bg-[#1F2C34]'}
        `}
      >
        <p dir="auto" className="text-[#111B21] dark:text-white whitespace-pre-wrap break-words">
          {content}
        </p>
        <span className="float-right text-[#667781] dark:text-[#8796A1] text-[0.6875rem] leading-[1.375rem] ml-1.5 mt-[-2px]">
          {timestamp}
        </span>
        
        {/* Message tail */}
        <div 
          className={`absolute ${isOutgoing ? '-right-2' : '-left-2'} bottom-0`}
        >
          <svg viewBox="0 0 8 13" width="8" height="13">
            <path 
              className={`${isOutgoing ? 'fill-[#E0FCD9] dark:fill-[#025C4C]' : 'fill-white dark:fill-[#1F2C34]'}`}
              d="M5.42.776L0 6.223v6h2.776l5.422-5.447-2.776-6z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
} 