import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { XcodeProjectInfo, XcodePlatform } from '../../shared/types'

/**
 * Detect an Xcode project at the given path and return info for opening it.
 * Checks for .xcworkspace, .xcodeproj, or Package.swift in priority order.
 */
export function detectXcodeProject(projectPath: string): XcodeProjectInfo | null {
  let entries: string[]
  try {
    entries = readdirSync(projectPath)
  } catch {
    return null
  }

  const workspace = entries.find(e => e.endsWith('.xcworkspace'))
  const xcodeproj = entries.find(e => e.endsWith('.xcodeproj'))

  if (workspace) {
    const openPath = join(projectPath, workspace)
    const platform = xcodeproj ? readPlatformFromPbxproj(projectPath, xcodeproj) : null
    return { openPath, type: 'xcworkspace', name: workspace, platform }
  }

  if (xcodeproj) {
    const openPath = join(projectPath, xcodeproj)
    const platform = readPlatformFromPbxproj(projectPath, xcodeproj)
    return { openPath, type: 'xcodeproj', name: xcodeproj, platform }
  }

  if (entries.includes('Package.swift')) {
    const openPath = join(projectPath, 'Package.swift')
    const platform = detectPlatformFromPackageSwift(projectPath)
    return { openPath, type: 'spm', name: 'Package.swift', platform }
  }

  return null
}

function resolvePlatform(platforms: Set<XcodePlatform>): XcodePlatform | null {
  if (platforms.size === 0) return null
  if (platforms.size > 1) return 'multiplatform'
  return [...platforms][0]
}

/**
 * Read platform from a known .xcodeproj's project.pbxproj file.
 */
function readPlatformFromPbxproj(projectPath: string, xcodeproj: string): XcodePlatform | null {
  try {
    const content = readFileSync(join(projectPath, xcodeproj, 'project.pbxproj'), 'utf-8')
    return parsePlatformFromPbxproj(content)
  } catch {
    return null
  }
}

function parsePlatformFromPbxproj(content: string): XcodePlatform | null {
  const platforms = new Set<XcodePlatform>()

  if (/SDKROOT\s*=\s*iphoneos/i.test(content)) platforms.add('iOS')
  if (/SDKROOT\s*=\s*macosx/i.test(content)) platforms.add('macOS')
  if (/SDKROOT\s*=\s*watchos/i.test(content)) platforms.add('watchOS')
  if (/SDKROOT\s*=\s*appletvos/i.test(content)) platforms.add('tvOS')
  if (/SDKROOT\s*=\s*xros/i.test(content)) platforms.add('visionOS')

  if (/SUPPORTS_MACCATALYST\s*=\s*YES/i.test(content)) {
    platforms.add('iOS')
    platforms.add('macOS')
  }

  const spMatch = content.match(/SUPPORTED_PLATFORMS\s*=\s*"([^"]+)"/)
  if (spMatch) {
    const val = spMatch[1]
    if (/iphoneos|iphonesimulator/.test(val)) platforms.add('iOS')
    if (/macosx/.test(val)) platforms.add('macOS')
    if (/watchos|watchsimulator/.test(val)) platforms.add('watchOS')
    if (/appletvos|appletvsimulator/.test(val)) platforms.add('tvOS')
    if (/xros|xrsimulator/.test(val)) platforms.add('visionOS')
  }

  return resolvePlatform(platforms)
}

function detectPlatformFromPackageSwift(projectPath: string): XcodePlatform | null {
  try {
    const content = readFileSync(join(projectPath, 'Package.swift'), 'utf-8')
    const platforms = new Set<XcodePlatform>()

    if (/\.iOS\s*\(/.test(content)) platforms.add('iOS')
    if (/\.macOS\s*\(/.test(content)) platforms.add('macOS')
    if (/\.watchOS\s*\(/.test(content)) platforms.add('watchOS')
    if (/\.tvOS\s*\(/.test(content)) platforms.add('tvOS')
    if (/\.visionOS\s*\(/.test(content)) platforms.add('visionOS')

    return resolvePlatform(platforms)
  } catch {
    return null
  }
}
