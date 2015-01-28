Simple web application built with [Node](http://nodejs.org/), [MySQL](http://www.mysql.com/), [NoGap](https://github.com/Domiii/NoGap) and [Angular](https://angularjs.org/) and [Bootstrap](http://getbootstrap.com/).

# Installation
1. Install [Node](http://nodejs.org/) (make sure to add it to your global PATH)
2. Install [MySQL](http://www.mysql.com/) or [XAMPP](https://www.apachefriends.org/)
3. Install a MySQL database manager, such as [MySQL Workbench](http://www.mysql.com/products/workbench/) or [SQLyog](http://www.softpedia.com/get/Internet/Servers/Database-Utils/SQLyog-Community-Edition.shtml)
4. Install a Git client, such as [MSysgit](https://msysgit.github.io/) [Windows] or [others](http://git-scm.com/downloads)
5. Open a command line, aka shell, aka terminal [e.g. `cmd` on Windows]
6. Go to your code folder, using `cd`
7. Run: `git clone https://github.com/Domiii/node-sample-app.git` [to download this code]
8. Run: `cd node-sample-app`
9. Run: `npm install` [to download and install all necessary libraries and other dependencies of this code]
10. Configure your application: Create a new file `appConfig.user.js` and add your own config: `module.exports = { ... }`

    Example DB configuration:
    ```js
    module.exports = {
        'db' : {
            'host'     : 'localhost',
            'user'     : 'root',
            'password' : '',            // no password
            'database' : 'my_db'
        },
    };
    ```
    You can make more customizations by copying and overriding any values from [appConfig.js](https://github.com/Domiii/node-sample-app/blob/master/appConfig.js).
    
11. Run: `node app.js`
12. Open your browser and go to: `localhost:9132`

Done!

# Other Tools
* [Sublime Text](http://www.sublimetext.com/) [for editing and writing code]
    * Tools -> Open Project -> `Presentations.sublime-project`
