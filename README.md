Simple web application built with [Node](http://nodejs.org/), [MySQL](http://www.mysql.com/), [NoGap](https://github.com/Domiii/NoGap) and [Angular](https://angularjs.org/) and [Bootstrap](http://getbootstrap.com/).

# Installation
1. Install [Node](http://nodejs.org/)
2. Install [MySQL](http://www.mysql.com/) (or [XAMPP](https://www.apachefriends.org/))
3. Install a MySQL database manager, such as [MySQL Workbench](http://www.mysql.com/products/workbench/) or [SQLyog](http://www.softpedia.com/get/Internet/Servers/Database-Utils/SQLyog-Community-Edition.shtml)
4. Install a Git client, such as [MSysgit](https://msysgit.github.io/) [Windows] or [others](http://git-scm.com/downloads)
5. Open a command line [`cmd` on Windows]
6. Run: `git clone https://github.com/Domiii/node-sample-app.git` (download this code)
7. Run: `npm install` [to automatically download and install all necessary libraries and other dependencies]
8. Configure your application. Create a new file `appConfig.user.js` and configure your DB.

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

9. Run: `node app.js`
10. Open your browser and go to: `localhost:9132`

Done!

# Other Tools
* [Sublime Text](http://www.sublimetext.com/) [for editing and writing code]
    * Tools -> Open Project -> `*.sublime-project`
