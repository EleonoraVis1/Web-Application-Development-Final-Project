The website is built using TypeScript. Vite was also used but there were too many files associated with it, making them impossible to upload. The TypeScript files is in "src" directory and were built into JavaScript files.

HTML files are kept in backend/api/templates.
JS files are kept in backend/api/static.

All the backend implemented using Django. The website is run using "python3 manage.py runserver"

Database Schema
The database consists of several tables:

- Meme (id, user, title, image, category, created_at)
- Runner (id, name, image, description, is_quiz_runner, quiz_order)
- Vote (id, user, runner, created_at)
- Quiz (id, title, has_correct_answers)
- Question (id, quiz, text)
- Answer (id, question, text, is_correct)
- Story (id, author, content, created_at)
- Reaction (id, user, story, created_at)
- WebsiteRating (id, user, rating)
- TimelineEvent (id, year, description, order)
- TimelineReference (id, event, title, description, question, answer)
- MileageResult (id, user, age, injury, desired_mileage, start_mileage, jump, weeks, created_at)


RESTful API urls: 
BASE_PATH: http://127.0.0.1:8000/api/
- "protected/"                         METHOD: GET. Helps authenticate a user
- "token/"                             METHOD: POST. Authenticates a user and creates a JWT token.
- "token/refresh/"                     METHOD: POST. Refreshes the token.
- "memes/"                             METHOD: GET. Gets all the memes from the database.
- "memes/"                             METHOD: POST. Uploads a new meme to the database. 
- "memes/<int:pk>/"                    METHOD: DELETE. Admins can delete memes (requires admin privileges).
- "vote/"                              METHOD: POST. Allows a user to vote for a runner.
- "vote/stream/"                       A special url used by a server to watch votes and send events.
- "runners/",                          METHOD: GET. Gets runners information from the database.
- "runners/create/"                    METHOD: POST. Allows a user to add a new runner to the database.
- "runners/<int:pk>/"                  METHOD: DELETE/PUT. ALlows to delete/modify a runner (requires admin privileges).
- "users/me/"                          METHOD: GET. Get information about a logged in user.
- "login/"                             METHOD: GET. Uploads a login page.
- ""                                   METHOD: GET. Uploads a main page.
- ""                                   A special url used by Prometheus.
- "register/"                          METHOD: GET. Uploads a registration page.
- "register-user/"                     METHOD: POST. Registers a new user.
- "runners/quiz/"                      METHOD: GET. Gets information about runners for a quiz.
- "quizzes/"                           METHOD: GET. Gets information about all the quizzes.
- "quizzes/<int:pk>/"                  METHOD: GET. Gets information for a specific quiz.
- "quizzes/submit/"                    METHOD: POST. Submits quiz results.
- "stories/"                           METHOD: GET. Gets all the stories from the database.
- "stories/<int:story_id>/react/"      METHOD: POST. Allows a user to react to a story.
- "stories/<int:pk>/delete/"           METHOD: POST. Allows to delete a story (requires admin privileges).
- "stories/search/"                    METHOD: GET. Allows a user to search for stories containing sprecific words/characters.
- "website-rating/"                    METHOD: GET. Gets a previoud website rating from a database.
- "website-rating/"                    METHOD: POST. Submits a new rating to the database.
- "timeline/"                          METHOD: GET. Gets timeline events from a database.
- ""                                   A special url used by routers.
- "events/<int:event_id>/references/"  METHOD: GET. Gets references for timeline events.
- "mileage/"                           METHOD: GET. Get the last mileage plan for a user.
- "mileage/"                           METHOD: POST. Submits a new mileage plan to the database.
- "mileage/history/"                   METHOD: GET. Gets all the mileage plans for a user.
- "metrics/"                           METHOD: GET. Gets metrics for the future Prometheus/Grafana use.
- "stats/"                             METHOD: GET. Gets statistics from the database.

Logging is monitoring were implemented.
Prometheus and Grafana use were implemented.

Note: The website was tested in Chrome, Edge and Firefox.
