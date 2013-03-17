Semantic Services for the SMART Disease Monograph
-------------------------------------------------

For more information, see http://smartplatforms.org

Installation for Ubuntu 12.04
-----------------------------

1. Update apt-get manifests:

   $ sudo apt-get update

2. Install PostgreSQL:

   $ sudo apt-get install postgresql

3. Add the 'smart' user

   $ sudo su postgres
   $ createuser --superuser smart
   $ psql
   $ postgres-# \password smart
   $ postgres-# \q
   $ exit

4. Edit /etc/postgresql/9.1/main/pg_hba.conf:

   change
	local	all	all	xxx
   to
	local	all	all	md5
   save

5. Restart PostgreSQL:

   $ sudo service postgresql restart

6. Install git:

   $ sudo apt-get install git

7. Install node.js:

   $ sudo add-apt-repository ppa:chris-lea/node.js
   $ sudo apt-get update
   $ sudo apt-get install nodejs

8. Determine where you would like to place the project files:

   $ cd /project/files/location

9. Clone the project files:

   $ git clone https://bitbucket.org/cingulata/semantic.git

10. Install the production ("xxx" = "prod") or staging ("xxx" = "stage") environment:

    $ cd semantic
    $ sudo ./install.sh xxx

11. Start the production ("xxx" = "semantic") or staging ("xxx" = "semantic-stage") services:

    $ sudo start xxx

12. Test production by browsing to http://localhost or staging by browsing to http://localhost:8000
