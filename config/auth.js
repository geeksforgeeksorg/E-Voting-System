module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/users/login');
    },
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        if(req.isAdmin){
            res.redirect("/admin.dashboard")
        }
        res.redirect('/users/dashboard');
    },
    ensureAdmin: function(req, res, next) {
        if (req.isAuthenticated() && req.user.isAdmin) {
            return next();
        }
        req.flash('error_msg', 'Admin access only');
        res.redirect('/admin/login');
    }
};
