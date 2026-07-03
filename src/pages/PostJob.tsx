import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { JOB_CATEGORIES } from "@/lib/constants";

export default function PostJob() {
  const navigate = useNavigate();
  const createJob = useMutation(api.jobs.createJob);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !price || !address) {
      toast.error("Please fill in all required fields");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);
    try {
      await createJob({
        title,
        description,
        category: category as any,
        price: Math.round(priceNum * 100), // Convert to øre (cents)
        address,
        city: city || undefined,
        location: { lat: 0, lng: 0 }, // Note: real geocoding from address needed in production
        scheduledDate: scheduledDate
          ? new Date(scheduledDate).getTime()
          : undefined,
      });
      toast.success("Job posted successfully!");
      navigate("/jobs");
    } catch (e: any) {
      toast.error(e.message || "Failed to post job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to jobs
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
            <CardHeader>
              <CardTitle className="text-2xl font-black">
                Post a New Job
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Describe what you need done and neighbors will offer to help.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Job Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g. "Mow my front lawn"'
                    className="rounded-none border-2 border-foreground"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full rounded-none border-2 border-foreground">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Description <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the job in detail. Include size, duration, any special requirements..."
                    className="rounded-none border-2 border-foreground"
                    rows={4}
                    required
                  />
                </div>

                {/* Price & Address row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold block mb-1">
                      Price (DKK) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="200"
                      className="rounded-none border-2 border-foreground"
                      min="10"
                      step="10"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Suggested: 100-500 kr depending on the task
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-1">
                      Scheduled Date
                    </label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="rounded-none border-2 border-foreground"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for flexible timing
                    </p>
                  </div>
                </div>

                {/* Address row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold block mb-1">
                      Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nørrebrogade 12"
                      className="rounded-none border-2 border-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-1">
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Copenhagen"
                      className="rounded-none border-2 border-foreground"
                    />
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  <Send className="size-4" />
                  {isSubmitting ? "Posting..." : "Post Job"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
