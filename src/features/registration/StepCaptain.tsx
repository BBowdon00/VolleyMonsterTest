import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { captainSchema } from '@/lib/schemas/registration'
import type { Captain } from '@/lib/schemas/registration'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRegistration } from './registrationStore'

export default function StepCaptain() {
  const { state, dispatch } = useRegistration()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Captain>({
    resolver: zodResolver(captainSchema),
    defaultValues: state.captain,
  })

  function onBack() {
    dispatch({ type: 'SET_STEP', step: 'days' })
  }

  function onSubmit(data: Captain) {
    dispatch({ type: 'SET_CAPTAIN', captain: data })
    dispatch({ type: 'SET_STEP', step: 'roster' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your Info</h2>
        <p className="mt-1 text-sm text-gray-500">
          We&apos;ll use this to contact you about your registration.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="captain-name">Full Name</Label>
          <Input
            id="captain-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className="mt-1"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="captain-email">Email Address</Label>
          <Input
            id="captain-email"
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            className="mt-1"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="captain-phone">Phone Number</Label>
          <Input
            id="captain-phone"
            type="tel"
            autoComplete="tel"
            placeholder="(301) 555-1234"
            className="mt-1"
            {...register('phone')}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="captain-city">City</Label>
          <Input
            id="captain-city"
            type="text"
            autoComplete="address-level2"
            placeholder="Rockville"
            className="mt-1"
            {...register('city')}
          />
          {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit">Next →</Button>
      </div>
    </form>
  )
}
