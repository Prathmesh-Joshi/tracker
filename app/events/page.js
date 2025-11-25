'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Navbar } from '@/components/Navbar'
import { AnimatedEventCard } from '@/components/AnimatedEventCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Search, Filter, Calendar, Plus, Users, DollarSign, Grid, Sparkles } from 'lucide-react'
import { isToday, isTomorrow, isPast, isThisWeek, isThisMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { deleteDoc, doc, updateDoc, collection, onSnapshot, query, where, addDoc, arrayUnion, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { EditEventModal } from '@/components/EditEventModal'
import { ViewEventModal } from '@/components/ViewEventModal'
import { EventModal } from '@/components/EventModal'



export default function EventsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [animationKey, setAnimationKey] = useState(0)
  const [editingEvent, setEditingEvent] = useState(null)
  const [viewEvent, setViewEvent] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // wait until auth finished
    if (loading) return
    if (!user) return

    const eventsCollection = collection(db, 'events')

    // onSnapshot with logging so we can see whether realtime listener fires
    const unsubscribe = onSnapshot(
      eventsCollection,
      (snapshot) => {
        console.log('onSnapshot fired, docs:', snapshot.size)
        const fetchedEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

        if (user.role !== 'admin') {
          const visible = fetchedEvents.filter(ev => {
            // If an event is explicitly private, only allow creator or registered users
            const explicitlyPrivate = ev.isPublic === false || ev.isPrivate === true

            // helper: handle registeredUsers as array of objects or uids
            const isRegistered = Array.isArray(ev.registeredUsers) && ev.registeredUsers.some(u =>
              typeof u === 'string' ? u === user.uid : (u && u.uid) === user.uid
            )

            if (explicitlyPrivate) {
              if (ev.createdBy === user.uid) return true
              if (isRegistered) return true
              return false
            }

            // otherwise show event (treat missing isPublic as public)
            return true
          })
          setEvents(visible)
        } else {
          setEvents(fetchedEvents)
        }
      },
      (error) => {
        console.error('onSnapshot error fetching events:', error)
        toast.error('Failed to load events: ' + error.message)
      }
    )

    // fallback: if onSnapshot doesn't deliver within 2s, do a one-time getDocs
    const fallbackTimer = setTimeout(async () => {
      try {
        console.warn('onSnapshot fallback: performing getDocs')
        const qSnap = await getDocs(eventsCollection)
        console.log('getDocs returned docs:', qSnap.size)
        const fetchedEvents = qSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        if (user.role !== 'admin') {
          const visible = fetchedEvents.filter(ev => {
            const explicitlyPrivate = ev.isPublic === false || ev.isPrivate === true
            const isRegistered = Array.isArray(ev.registeredUsers) && ev.registeredUsers.some(u =>
              typeof u === 'string' ? u === user.uid : (u && u.uid) === user.uid
            )

            if (explicitlyPrivate) {
              if (ev.createdBy === user.uid) return true
              if (isRegistered) return true
              return false
            }
            return true
          })
          setEvents(visible)
        } else {
          setEvents(fetchedEvents)
        }
      } catch (err) {
        console.error('getDocs fallback error:', err)
      }
    }, 2000)

    return () => {
      clearTimeout(fallbackTimer)
      unsubscribe()
    }
  }, [user, loading])

  useEffect(() => {
    let filtered = events
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter)
    }

    if (timeFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date)
        switch (timeFilter) {
          case 'today':
            return isToday(eventDate)
          case 'tomorrow':
            return isTomorrow(eventDate)
          case 'thisWeek':
            return isThisWeek(eventDate)
          case 'thisMonth':
            return isThisMonth(eventDate)
          case 'past':
            return isPast(eventDate)
          case 'upcoming':
            return !isPast(eventDate)
          default:
            return true
        }
      })
    }

    setFilteredEvents(filtered)
    setAnimationKey(prev => prev + 1)
  }, [events, searchTerm, categoryFilter, timeFilter, statusFilter])

  const handleClearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setTimeFilter('all')
    setStatusFilter('all')
  }

  const handleUpdateEvent = async (values) => {
    if (!editingEvent?.id) return
    try {
      const ref = doc(db, 'events', editingEvent.id)
      await updateDoc(ref, {
        ...values,
        updatedAt: new Date().toISOString(),
      })
      setEditingEvent(null)
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event.')
    }
  }

  // add this handler (place near other handlers / effects)
  const handleSaveEvent = async (eventData) => {
    if (!eventData || !eventData.title) {
      toast?.error?.('Event must have a title')
      return
    }

    try {
      // add to Firestore
      const docRef = await addDoc(collection(db, 'events'), {
        ...eventData,
        createdAt: new Date().toISOString(),
        participants: eventData.participants || 0,
        registeredUsers: eventData.registeredUsers || []
      })

      // DO NOT add the new event to local state here — onSnapshot will deliver it and
      // adding it locally as well causes duplicate entries.
      toast?.success?.('Event created')
      setShowEventModal(false)
    } catch (err) {
      console.error('Failed to add event:', err)
      toast?.error?.('Failed to add event')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-4 text-muted-foreground animate-pulse">Loading events...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const categories = [...new Set(events.map(event => event.category).filter(Boolean))]
  const statuses = [...new Set(events.map(event => event.status).filter(Boolean))]
  const totalEvents = events.length
  const upcomingEvents = events.filter(event => !isPast(new Date(event.date))).length
  const totalBudget = events.reduce((sum, event) => sum + (event.budget || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 mb-8 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Calendar className="h-10 w-10" />
                All Events
              </h1>
              <p className="text-indigo-100 text-lg">
                {user.role === 'admin'
                  ? 'Complete overview and management of all club events'
                  : 'Explore all upcoming and past club events'}
              </p>
            </div>
            {user.role === 'admin' && (
              <Button
                onClick={() => setShowEventModal(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 gap-2 hover:scale-105 transition-all duration-300"
                variant="ghost"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardHeader>
              <CardTitle>Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalEvents}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{upcomingEvents}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50">
            <CardHeader>
              <CardTitle>Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalBudget.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* EVENT GRID */}
        <div key={animationKey}>
          {filteredEvents.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-semibold mb-2">No events found</h3>
                <p className="text-muted-foreground mb-6">
                  No events have been scheduled yet. Be the first to create one!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((event, index) => (
                  <AnimatedEventCard
                    key={`${event.id}-${animationKey}`}
                    event={event}
                    user={user}
                    isAdmin={user.role === 'admin'}
                    showActions={user.role === 'admin'}
                    delay={index * 100}
                    onView={(event) => setViewEvent(event)}
                    onEdit={(event) => setEditingEvent(event)}
                    onDelete={async (event) => {
                      if (!event?.id) return toast.error('Event ID is missing.')
                      if (!confirm(`Are you sure you want to delete "${event.title}"?`)) return
                      try {
                        await deleteDoc(doc(db, 'events', event.id))
                      } catch (error) {
                        console.error('Error deleting event:', error)
                        toast.error('Failed to delete event.')
                      }
                    }}
                  >
                    {/* Register button for normal users only, updates count in frontend */}
                    {user.role === 'user' && (
                      <div className="mt-4 flex flex-col items-center">
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => {
                            setFilteredEvents(prev =>
                              prev.map(ev =>
                                ev.id === event.id
                                  ? { ...ev, participants: (ev.participants || 0) + 1 }
                                  : ev
                              )
                            )
                            toast.success('Registered for event!')
                          }}
                        >
                          Register for Event
                        </Button>
                        <div className="text-xs text-muted-foreground mt-2">
                          Participants: {event.participants || 0}
                        </div>
                      </div>
                    )}
                  </AnimatedEventCard>
                ))}
            </div>
          )}
        </div>
      </div>

      {viewEvent && (
        <ViewEventModal isOpen={!!viewEvent} event={viewEvent} onClose={() => setViewEvent(null)} />
      )}
      {editingEvent && (
        <EditEventModal open={!!editingEvent} event={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleUpdateEvent} />
      )}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          event={null}
          selectedDate={new Date()}
          isEditable={true}
          isAdmin={true}
        />
      )}

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  )
}
