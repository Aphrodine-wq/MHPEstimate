import { Button, Card } from "@proestimate/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="max-w-lg text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">ProEstimate AI</h1>
        <p className="mb-6 text-gray-600">
          AI-powered estimation platform for MS Home Pros
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" size="lg">
            Get Started
          </Button>
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </div>
      </Card>
    </main>
  );
}
