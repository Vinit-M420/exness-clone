import { Info, ChevronDown, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from '@radix-ui/react-dropdown-menu'


type Mode = 'Price' | 'Points'

interface TPSLInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  mode: Mode
  onModeChange: (m: Mode) => void
}

export function TPSLInput({
  label,
  value,
  onChange,
  mode,
  onModeChange,
}: TPSLInputProps) {

  // const [takeProfit, setTakeProfit] = useState();

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">{label}</label>
        <Info className="h-4 w-4 text-gray-500" />
      </div>

      {/* Control */}
      <div className="flex items-center gap-2">
        <InputGroup className="flex-1 bg-[#0f1118] z-1 border border-gray-700 rounded-lg overflow-hidden">
          <InputGroupInput
            type="text"
            value={value}
            onChange={(e) => {
              value = e.target.value.replace(/[^0-9.]/g, '');
              onChange(value);
            }}
            placeholder="Not set"
            className="border-0 text-gray-300 placeholder:text-gray-500 h-11 focus-visible:ring-0"
          />

          <InputGroupAddon align="inline-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <InputGroupButton
                    variant="ghost"
                    className="text-gray-400 gap-1 hover:text-gray-200"
                    >
                    {mode}
                    <ChevronDown className="h-3 w-3" />
                    </InputGroupButton>
                </DropdownMenuTrigger>

                <DropdownMenuPortal>
                    <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="z-1000 bg-[#1a1d2e] border border-gray-700 rounded-xl p-1 shadow-xl mt-2"
                    >
                    {(['Price', 'Points'] as const).map((m) => (
                        <DropdownMenuItem
                        key={m}
                        onSelect={() => onModeChange(m)}
                        className="text-gray-300 text-sm rounded-lg px-3 py-2 cursor-pointer
                                    focus:bg-[rgba(255,213,79,0.1)]
                                    focus:text-[#FFD54F]"
                        >
                        {m}
                        </DropdownMenuItem>
                    ))}
                    </DropdownMenuContent>
                </DropdownMenuPortal>
            </DropdownMenu>

          </InputGroupAddon>
        </InputGroup>

        {/* Step Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
          onClick={() => {
            const numValue = parseInt(value, 10) || 0;
            const newValue = Math.max(0, numValue - 1).toString();
            onChange(newValue);
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
          onClick={() => {
            const numValue = parseInt(value, 10) || 0;
            const newValue = Math.max(0, numValue + 1).toString();
            onChange(newValue);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
