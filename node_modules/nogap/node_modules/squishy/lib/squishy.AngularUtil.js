(function() {
	/**
	 * Members to be added to Angular $scopes.
	 */
	var ScopeMembers = {
	    /**
	     * Call $scope.$apply(fn), if it is safe to do so
	     *  (i.e. digest or apply cycle is currently not executing).
	     */
	    safeApply: function(fn) {
	        var phase = this.$root.$$phase;
	        if(phase == '$apply' || phase == '$digest') {
	            if(fn && (fn instanceof Function)) {
	                fn();
	            }
	        } else {
	            this.$apply(fn);
	        }
	    },

	    /**
	     * Uses `$attrs.$observe(attrName, ...)` to track changes to an attribute and
	     * uses `$scope.$eval` to update the property of same name in $scope.
	     * Same as using isolated scope: { <attrName>: '=' }.
	     * Also, if given, calls cb if the given attribute value changed.
	     */
	    bindAttrExpression: function($attrs, attrName, cb) {
	        // bind to the given attribute
	        this.$watch($attrs[attrName], function(newVal) {
	            // evaluate the attribute expression and update the scope
	            this[attrName] = newVal;
	            if (cb) {
	                cb(newVal);
	            }
	        }.bind(this));
	    },

	    handleError: function(err) {
	    	console.error(err && err.stack || err);
	    	this.onError(err);
	    },

	    /**
	     * Default error event handling -> Save to $scope.errorMessage and run digest cycle
	     */
	    onError: function(err) {
	    	this.errorMessage = (err && err.message) || err;
	    	this.safeApply();
	    },
	};


	squishy.getGlobalContext().AngularUtil = {
        decorateScope: function($scope) {
        	if ($scope.___decorated) return;
        	Object.defineProperty($scope, '___decorated', {
        		value: 1
        	});

        	// add AngularUtility functions to $scope and bind them
        	for (var memberName in ScopeMembers) {
        		var member = ScopeMembers[memberName];

        		if ($scope[memberName]) return;

        		// bind and add to scope
        		$scope[memberName] = member;
        	}

        	// make sure `handleError` is bound for conveneince 
        	//	(we don't want other methods to be bound because it messes with Angular's own scope functions!)
        	$scope.handleError = $scope.handleError.bind($scope);
        }
    };
})();