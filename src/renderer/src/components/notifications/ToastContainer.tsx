import { AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../../stores/useNotificationStore'
import { NotificationToast } from './NotificationToast'

export function ToastContainer() {
  const toasts = useNotificationStore(s => s.toasts)

  return (
    <div className="fixed top-14 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationToast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
