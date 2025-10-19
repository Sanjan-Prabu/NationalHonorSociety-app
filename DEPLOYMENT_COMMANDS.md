# Supabase Deployment Commands Reference

## Edge Functions
```bash
# Deploy a specific edge function
supabase deploy <function-name>

# Examples:
supabase deploy signupPublic
supabase deploy loginPublic
supabase deploy onboard-user-atomic
```

## Database
```bash
# Push migrations to remote database
supabase db push

# Reset database (applies all migrations from scratch)
supabase db reset --linked
```

## Logs
```bash
# View function logs
supabase functions logs <function-name>

# Examples:
supabase functions logs signupPublic
supabase functions logs signupPublic --follow  # real-time logs
```

## Common Workflow
```bash
# 1. Deploy function
supabase deploy signupPublic

# 2. Push database changes
supabase db push

# 3. Check logs
supabase functions logs signupPublic

# 4. Test function
curl -X POST "https://your-project.supabase.co/functions/v1/signupPublic" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","first_name":"Test","last_name":"User","organization":"nhs","code":"8002571"}'
```

## Notes
- Use `supabase deploy <function-name>` for edge functions (NOT `supabase functions deploy`)
- Always check logs after deployment to verify function is working
- Test with curl or the provided test scripts after deployment