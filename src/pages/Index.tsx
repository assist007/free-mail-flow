import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="text-center px-6 relative z-10">
        <h1 className="font-display text-6xl md:text-7xl font-bold text-foreground mb-6 opacity-0 animate-fade-in-up">
          Hello World
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto mb-8 opacity-0 animate-fade-in-up animate-delay-200">
          Your simple test project is ready to go.
        </p>
        <Button 
          size="lg" 
          className="opacity-0 animate-fade-in-up animate-delay-400 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
