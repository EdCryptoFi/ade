import { Suspense } from "react"
import SuccessView from "./SuccessView"

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessView />
    </Suspense>
  )
}
