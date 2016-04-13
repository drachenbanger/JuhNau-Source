(function () {
    window.YouNow.ReactComponents.UserBadge = React.createClass({
        displayName: 'UserBadge',

        propTypes: {
            role: React.PropTypes.any,
            level: React.PropTypes.number,
            subscriptionType: React.PropTypes.any,
            channelId: React.PropTypes.any,
            broadcaster: React.PropTypes.object,
            config: React.PropTypes.object
        },
        render: function () {
            var ynbadge = null,
                userLevelBadge = null,
                userCrowns = null,
                userLevelNum = null;

            if (this.props.subscriptionType != '0' || this.props.broadcaster.isSubscribabel && this.props.channelId == this.props.broadcaster.userId) {
                ynbadge = React.createElement(
                    'span',
                    { className: 'user-crowns ynbadge' },
                    React.createElement('img', { src: this.props.config.settings.BadgeBaseUrl + '/' + this.props.broadcaster.userId + '/' + (this.props.subscriptionType != '0' ? this.props.subscriptionType : 1) + '/badge@2x.png' })
                );
            }

            if (this.props.subscriptionType == '0' && this.props.level && (this.props.role == '0' || this.props.role == 3)) {
                userLevelBadge = React.createElement(
                    'span',
                    { className: 'user-crowns' },
                    React.createElement('i', { className: 'ynicon ynicon-level' })
                );
            }

            if (this.props.role == 2) {
                userCrowns = React.createElement(
                    'span',
                    { className: 'user-crowns' },
                    React.createElement('i', { className: 'ynicon ynicon-ambass' })
                );
            } else if ((this.props.role == 4 || this.props.role == 5 || this.props.role == 6) && this.props.level) {
                if (this.props.role == 4) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                } else if (this.props.role == 5) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                } else {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                }
            } else if ((this.props.role == 7 || this.props.role == 8 || this.props.role == 9) && this.props.level) {
                if (this.props.role == 7) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' })
                    );
                } else if (this.props.role == 8) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' })
                    );
                } else {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' })
                    );
                }
            } else if ((this.props.role == 10 || this.props.role == 11 || this.props.role == 12) && this.props.level) {
                if (this.props.role == 10) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                } else if (this.props.role == 11) {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                } else {
                    userCrowns = React.createElement(
                        'span',
                        null,
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-vip' }),
                        React.createElement('i', { className: 'ynicon ynicon-icon-whale' })
                    );
                }
            } else {}

            if (this.props.role != 1 && this.props.level > 1) {
                userLevelNum = React.createElement(
                    'span',
                    { className: 'chat-name level' },
                    React.createElement(
                        'b',
                        null,
                        this.props.level
                    )
                );
            }

            return React.createElement(
                'span',
                { className: 'crowns-container' },
                ynbadge,
                userLevelBadge,
                userCrowns,
                userLevelNum
            );
        }
    });
})();
