import { closestCenter, KeyboardSensor, PointerSensor, useSensors, } from '@dnd-kit/core'
import {   sortableKeyboardCoordinates,} from '@dnd-kit/sortable'

// eslint-disable-next-line react-hooks/rules-of-hooks
export const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )