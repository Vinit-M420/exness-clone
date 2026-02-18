import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/input-group'

interface TPSLInputProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function TPSLInput({
  label,
  value,
  onChange,
}: TPSLInputProps) {

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">{label}</label>
      </div>

      {/* Control */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex rounded-lg border border-gray-700 bg-transparent overflow-hidden">
          <InputGroup>
            <InputGroupInput
              type="text"
              value={value}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^0-9.]/g, '');
                onChange(cleanValue);
              }}
              placeholder="Not set"
              className="border-0 text-gray-300 placeholder:text-gray-500 h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <InputGroupAddon align="inline-end" className="text-sm text-gray-400">
              Price
            </InputGroupAddon>
          </InputGroup>
        </div>

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