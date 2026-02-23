/* eslint-disable react-hooks/rules-of-hooks */
import { KeyboardSensor, PointerSensor, useSensors, } from '@dnd-kit/core'
import {   sortableKeyboardCoordinates,} from '@dnd-kit/sortable'

export const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )