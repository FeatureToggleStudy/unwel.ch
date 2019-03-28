import React, { Component } from 'react'
import { graphql, Query } from 'react-apollo'
import gql from 'graphql-tag'
import { compose } from 'ramda'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { bindActionCreators } from 'redux'
import queryString from 'query-string'
import LockIcon from 'react-feather/dist/icons/lock'
import UnLockIcon from 'react-feather/dist/icons/unlock'
import GlobeIcon from 'react-feather/dist/icons/globe'

import DefaultContainer from 'components/default-container'
import BetInput from 'components/bet-input'
import Spacer from 'components/spacer'
import Avatar from 'components/avatar'
import Switch from 'components/switch'
import Text from 'components/text'
import Distribute from 'components/distribute'
import Split from 'components/split'
import { colors } from 'components/variables'

import { saveTempBet } from '../services'
import { showAnnounce } from '../../announce/actions'
import { showSaveAccountPopup } from '../../user/actions'
import { ADD_BET_MUTATION } from '../mutations'
import * as queries from '../bet-list/queries'
import { trackEvent, events } from '../../tracking'
import withNavigate from '../../navigation/withNavigate'
import withIsLoggedIn from '../../user/auth/withIsLoggedIn'
import { TranslatorConsumer } from '../../translations'

export const USER_QUERY = gql`
  query($userId: String!) {
    user(id: $userId) {
      id
      name
      avatar
    }
  }
`

const Visibility = styled(Spacer).attrs({
  top: 4
})`
  cursor: pointer;
`

class NewBet extends Component {
  state = {
    isPrivate: false
  }

  componentDidMount () {
    trackEvent(events.pageLoaded, { page: 'newBet' })
  }

  getTargetUserId () {
    return queryString.parse(window.location.search).targetUserId
  }

  handleBetConfirm = async bet => {
    if (!this.props.isLoggedIn) {
      saveTempBet({ ...bet, isPrivate: this.state.isPrivate })
      await this.props.goToPage(`/login`)
      return
    }

    this.props.showSaveAccountPopup()
    this.props.showAnnounce('announce.new-bet-created')
    const result = await this.props.addBet(
      bet.statement,
      bet.quantity,
      this.getTargetUserId(),
      this.state.isPrivate
    )
    await this.props.goToPage(`/bet/${result.data.addBet.id}`)
  }

  handleVisibilityChange = () => {
    this.setState({
      isPrivate: !this.state.isPrivate
    })
  }

  renderVersus (targetUserId) {
    return (
      <Query query={USER_QUERY} variables={{ userId: targetUserId }}>
        {({ loading, error, data }) => {
          if (loading) return null
          if (error) return null
          const user = data.user

          return (
            <Distribute align='center' position='end' space={1}>
              <div>
                <Text inline jsize='size0'>
                  versus{' '}
                </Text>
                <Text
                  inline
                  size="size0"
                  fontWeight="black"
                  data-qa="target-name">
                  {user.name}
                </Text>
              </div>
              <Avatar size={4} user={user} />
            </Distribute>
          )
        }}
      </Query>
    )
  }

  render () {
    const targetUserId = this.getTargetUserId()

    return (
      <TranslatorConsumer>
        {t => (
          <DefaultContainer>
            <Spacer top={6}>
              <BetInput
                starter={t('new-bet-phrase.verb')}
                middle={t('new-bet-phrase.preposition')}
                onConfirm={this.handleBetConfirm}
              />
              <Visibility>
                <Distribute space={2} align='center'>
                  <Switch
                    onChange={this.handleVisibilityChange}
                    checked={!this.state.isPrivate}
                    checkedIcon={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          paddingRight: 2
                        }}
                      >
                        <GlobeIcon color='white' />
                      </div>
                    }
                    uncheckedIcon={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          paddingRight: 2
                        }}
                      >
                        <LockIcon color='white' />
                      </div>
                    }
                  />
                  <Text size='size1' onClick={this.handleVisibilityChange}>
                    {this.state.isPrivate
                      ? t('bet.visibility.private')
                      : t('bet.visibility.public')}
                  </Text>
                </Distribute>
              </Visibility>
            </Spacer>
            {targetUserId && (
              <Spacer top={3}>{this.renderVersus(targetUserId)}</Spacer>
            )}
          </DefaultContainer>
        )}
      </TranslatorConsumer>
    )
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators(
    {
      showAnnounce,
      showSaveAccountPopup
    },
    dispatch
  )
}

export default compose(
  graphql(ADD_BET_MUTATION, {
    props: ({ mutate }) => ({
      addBet: (statement, quantity, targetUserId, isPrivate) =>
        mutate({ variables: { statement, quantity, targetUserId, isPrivate } })
    }),
    options: () => ({
      refetchQueries: [
        {
          query: queries.BET_LIST
        }
      ]
    })
  }),
  connect(
    null,
    mapDispatchToProps
  ),
  withNavigate,
  withIsLoggedIn
)(NewBet)
