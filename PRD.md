MVP1

1. Implement PKCE flow for authentication using OAuth 2.0 Authorization Code Flow
2. It shluld be a node cli tool 
3. It should have a help menu
4. It should have a version menu(should display version and ASCII art logo (auth-pkce))
5. It should have a config file with config cli options should be saved in user home directory same as aws cli(aws configure sso), it should ask for all required options and save it in config file.
6. It should have a logging system
7. ir should have derive all the url option from oauth2/token/.well-known/openid-configuration with given base url like base_IRL/oauth2/token/.well-known/openid-configuration and save it locally on first run
8. It should override the url option to config file if user run config command again or given --base-url option
9. It should have a command to get the access token
10. It should have a command to refresh the access token (like auth_pkce login user_id passsword)
11. It should have a command to get the user info (like auth_pkce whoami)
12. It should have a command to logout (like auth_pkce logout)
13. It should have a command to get the access token from refresh token (like auth_pkce refresh)
14. Build entire project in typescript following best practices to build cli tool.
15. create npm publish config.
16. Make sure it uses available default browser to open the authorization url.
17. Make sure it has a good error handling system.
18. Make sure it has a good logging system.
19. Make sure it has a good configuration system.
20. Make sure it has a good security system.
21. Make sure it has a good performance system.
22. Make sure it has a good documentation system.
23. Make sure it can be use as global cli tool.(npm i -g auth-pkce) so that user can use it from anywhere.
24. Add future enhancement plan.



