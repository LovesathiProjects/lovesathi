"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhotoGrid } from "@/components/profile/photo-grid"
import { MatrimonyPreferences } from "@/components/profile/matrimony-preferences"
import { User, Camera } from "lucide-react"
import { BackFloatingButton } from "@/components/navigation/back-floating-button"
import { StaticBackground } from "@/components/discovery/static-background"
import { LocationCascadeSelect } from "@/components/location/location-cascade-select"
import { formatLocationValue, parseLocationValue } from "@/lib/location"
import { EDUCATION_OPTIONS } from "@/lib/matrimonyOptions"

interface ProfileSetupProps {
  onComplete?: () => void
  onBack?: () => void
}

export function ProfileSetup({ onComplete, onBack }: ProfileSetupProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    height: "",
    occupation: "",
    education: "",
    location: "",
    bio: "",
    interests: [] as string[],
    lifestyle: {
      smoking: "",
      drinking: "",
      diet: "",
      exercise: ""
    }
  })

  const handleSave = () => {
    // Save profile logic here
    onComplete?.()
  }

  return (
    <div className="min-h-screen relative">
      <StaticBackground />
      <div className="sticky top-0 glass-apple border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Complete Your Profile</h1>
          </div>
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
        </div>
      </div>

      <div className="p-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
            <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
            <TabsTrigger value="lifestyle" className="text-xs">Lifestyle</TabsTrigger>
          </TabsList>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Your Photos</span>
                </CardTitle>
                <CardDescription>
                  Add up to 6 photos to showcase your personality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoGrid />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Tell us about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Select onValueChange={(value) => setProfile(prev => ({ ...prev, height: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select height" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5'0">5'0"</SelectItem>
                        <SelectItem value="5'1">5'1"</SelectItem>
                        <SelectItem value="5'2">5'2"</SelectItem>
                        <SelectItem value="5'3">5'3"</SelectItem>
                        <SelectItem value="5'4">5'4"</SelectItem>
                        <SelectItem value="5'5">5'5"</SelectItem>
                        <SelectItem value="5'6">5'6"</SelectItem>
                        <SelectItem value="5'7">5'7"</SelectItem>
                        <SelectItem value="5'8">5'8"</SelectItem>
                        <SelectItem value="5'9">5'9"</SelectItem>
                        <SelectItem value="5'10">5'10"</SelectItem>
                        <SelectItem value="5'11">5'11"</SelectItem>
                        <SelectItem value="6'0">6'0"</SelectItem>
                        <SelectItem value="6'1">6'1"</SelectItem>
                        <SelectItem value="6'2">6'2"</SelectItem>
                        <SelectItem value="6'3">6'3"</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <LocationCascadeSelect
                      value={parseLocationValue(profile.location)}
                      onChange={(location) => setProfile((prev) => ({ ...prev, location: formatLocationValue(location) }))}
                      countryLabel="Country"
                      stateLabel="State"
                      cityLabel="City"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={profile.occupation}
                    onChange={(e) => setProfile(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Your job title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Select onValueChange={(value) => setProfile(prev => ({ ...prev, education: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">About Me</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself, your interests, and what you're looking for..."
                    className="min-h-32 resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {profile.bio.length}/500
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lifestyle Tab */}
          <TabsContent value="lifestyle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lifestyle Preferences</CardTitle>
                <CardDescription>
                  Share your lifestyle choices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Smoking</Label>
                    <Select onValueChange={(value) => setProfile(prev => ({ 
                      ...prev, 
                      lifestyle: { ...prev.lifestyle, smoking: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="socially">Socially</SelectItem>
                        <SelectItem value="regularly">Regularly</SelectItem>
                        <SelectItem value="trying-to-quit">Trying to quit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Drinking</Label>
                    <Select onValueChange={(value) => setProfile(prev => ({ 
                      ...prev, 
                      lifestyle: { ...prev.lifestyle, drinking: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="socially">Socially</SelectItem>
                        <SelectItem value="regularly">Regularly</SelectItem>
                        <SelectItem value="occasionally">Occasionally</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diet</Label>
                    <Select onValueChange={(value) => setProfile(prev => ({ 
                      ...prev, 
                      lifestyle: { ...prev.lifestyle, diet: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                        <SelectItem value="pescatarian">Pescatarian</SelectItem>
                        <SelectItem value="kosher">Kosher</SelectItem>
                        <SelectItem value="halal">Halal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Exercise</Label>
                    <Select onValueChange={(value) => setProfile(prev => ({ 
                      ...prev, 
                      lifestyle: { ...prev.lifestyle, exercise: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="few-times-week">Few times a week</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="occasionally">Occasionally</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matrimony Tab */}
          <TabsContent value="matrimony" className="space-y-6">
            <MatrimonyPreferences />
          </TabsContent>
        </Tabs>
      </div>

      <BackFloatingButton onClick={onBack} />
    </div>
  )
}
