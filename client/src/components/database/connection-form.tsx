import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDbConnectionSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const formSchema = insertDbConnectionSchema.extend({
  savePassword: z.boolean().default(true),
});

interface ConnectionFormProps {
  onSuccess?: (id: number) => void;
}

export function ConnectionForm({ onSuccess }: ConnectionFormProps) {
  const { toast } = useToast();
  const [testingConnection, setTestingConnection] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      host: "localhost",
      port: 5432,
      database: "",
      username: "postgres",
      password: "",
      ssl: false,
      savePassword: true,
    },
  });

  const createConnection = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { savePassword, ...connectionData } = data;
      const res = await apiRequest("POST", "/api/connections", connectionData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection created",
        description: `Successfully connected to database "${data.name}"`,
      });
      if (onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      const formData = form.getValues();
      const { savePassword, ...connectionData } = formData;
      
      const res = await apiRequest("POST", "/api/connections/test", connectionData);
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to the database",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Failed to connect to the database with the provided credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createConnection.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Name</FormLabel>
              <FormControl>
                <Input placeholder="My PostgreSQL Database" {...field} />
              </FormControl>
              <FormDescription>
                A friendly name to identify this connection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="5432" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 5432)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database</FormLabel>
              <FormControl>
                <Input placeholder="postgres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="postgres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="•••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center space-x-4">
          <FormField
            control={form.control}
            name="ssl"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Use SSL Connection</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="savePassword"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Save Password</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={testConnection}
            disabled={testingConnection || createConnection.isPending}
          >
            {testingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button 
            type="submit"
            disabled={testingConnection || createConnection.isPending}
          >
            {createConnection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </div>
      </form>
    </Form>
  );
}
