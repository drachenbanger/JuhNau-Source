(function () {
    window.YouNow.ReactComponents.GuestListComponent = React.createClass({
        displayName: "GuestListComponent",

        propTypes: {
            guests: React.PropTypes.array,
            userId: React.PropTypes.any,
            config: React.PropTypes.object,
            openProfile: React.PropTypes.func.isRequired,
            inviteGuest: React.PropTypes.func.isRequired,
            broadcaster: React.PropTypes.object,
            translatedText: React.PropTypes.object
        },
        render: function () {
            var userId = this.props.userId,
                config = this.props.config,
                broadcaster = this.props.broadcaster,
                guest_make = this.props.translatedText.guest_make,
                _openProfile = this.props.openProfile,
                _inviteGuest = this.props.inviteGuest,
                openProfile = function (i) {
                _openProfile(this, i);
            },
                inviteGuest = function () {
                _inviteGuest(this);
            },
                extraSummary,
                description,
                guestItems,
                UserBadgeRt = window.YouNow.ReactComponents.UserBadge;

            if (this.props.guests && this.props.guests.length > 0) {
                var guestList = this.props.guests.map(function (guest, i) {
                    if (guest.userId != userId) {
                        if (guest.bars > 0 && guest.formattedLocation.length > 0) {
                            extraSummary = React.createElement(
                                "div",
                                null,
                                React.createElement(
                                    "span",
                                    { className: "guest-bars" },
                                    React.createElement("i", { className: "ynicon ynicon-icon-bar" }),
                                    " ",
                                    guest.bars
                                ),
                                React.createElement(
                                    "span",
                                    { className: "bullet" },
                                    "•"
                                ),
                                React.createElement(
                                    "span",
                                    { className: "guest-location" },
                                    guest.formattedLocation
                                )
                            );
                        } else if (guest.bars > 0) {
                            extraSummary = React.createElement(
                                "div",
                                null,
                                React.createElement(
                                    "span",
                                    { className: "guest-bars" },
                                    React.createElement("i", { className: "ynicon ynicon-icon-bar" }),
                                    " ",
                                    guest.bars
                                )
                            );
                        } else if (guest.formattedLocation.length > 0) {
                            extraSummary = React.createElement(
                                "div",
                                null,
                                React.createElement(
                                    "span",
                                    { className: "guest-location" },
                                    guest.formattedLocation
                                )
                            );
                        } else {
                            extraSummary = null;
                        }

                        if (guest.description && guest.description.length > 0) {
                            description = React.createElement(
                                "div",
                                { className: "description line-clamp" },
                                guest.description
                            );
                        } else {
                            description = null;
                        }
                        return React.createElement(
                            "div",
                            { className: "guest", key: guest.userId },
                            React.createElement("div", { className: "thumb clickable", onClick: openProfile.bind(guest.userId, i), style: { "backgroundImage": "url(" + config.settings.GuestSnapshotsBaseUrl + guest.snapshotUrl + ")", "backgroundSize": "cover" } }),
                            React.createElement(
                                "div",
                                { className: "summary" },
                                React.createElement(
                                    "div",
                                    { className: "guest-name short-text clickable", onClick: openProfile.bind(guest.userId, i) },
                                    React.createElement(UserBadgeRt, { role: guest.chatRole, level: guest.level, subscriptionType: guest.subscriptionType, channelId: guest.userId, broadcaster: broadcaster, config: config }),
                                    React.createElement(
                                        "b",
                                        null,
                                        guest.name
                                    )
                                ),
                                extraSummary,
                                description,
                                React.createElement(
                                    "button",
                                    { className: "btn btn-primary", onClick: inviteGuest.bind(guest) },
                                    guest_make
                                )
                            )
                        );
                    }
                });
                return React.createElement(
                    "div",
                    null,
                    guestList
                );
            } else {
                return null;
            }
        }
    });
})();
